using Newtonsoft.Json.Linq;
using NLog;
using Npgsql;
using Scholarly.Ai;
using Microsoft.Extensions.Configuration;

public interface IMetadataService
{
    Task ExtractMetadataAsync(Logger logger, string pdfPath, string _connectionStrings, string doi, int upload_id);
}

public class MetadataService : IMetadataService
{
    private readonly HttpClient _httpClient;
    private readonly string _unpaywallEmail;
    public MetadataService(IConfiguration configuration)
    {
        _httpClient = new HttpClient();
        _unpaywallEmail = configuration["Unpaywall:Email"];
    }
    private async Task<JObject> FetchUnpaywallDataAsync(string doi)
    {
        string url = $"https://api.unpaywall.org/v2/{doi}?email={_unpaywallEmail}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("User-Agent", $"PDFAnalyzer/1.0 (mailto:{_unpaywallEmail})");

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        string json = await response.Content.ReadAsStringAsync();

        return JObject.Parse(json);
    }

    private JObject BuildMetadataFromUnpaywall(JObject data, string doi)
    {
        var authors = string.Join(", ",
            data["z_authors"]?.Select(a => a["raw_author_name"]?.ToString() ?? "") ?? new string[] { });

        var affiliations = data["z_authors"]?
            .Select(a => a["raw_affiliation_strings"]?.FirstOrDefault()?.ToString() ?? "Unknown")
            .ToList() ?? new List<string> { "Unknown" };

        return new JObject
        {
            ["title"] = data["title"] ?? "Unknown",
            ["authors"] = string.IsNullOrWhiteSpace(authors) ? "Unknown" : authors,
            ["affiliations"] = new JArray(affiliations),
            ["abstract"] = data["abstract"] ?? "",
            ["publisher"] = data["publisher"] ?? "Unknown",
            ["publication_date"] = data["published_date"] ?? "Unknown",
            ["journal"] = data["journal_name"] ?? "Unknown",
            ["doi"] = doi,
            ["open_access"] = data["is_oa"] ?? false,
            ["citation_count"] = data["cited_by_count"] ?? 0
        };
    }

    private async Task<JObject> FetchCrossRefDataAsync(string doi)
    {
        string url = $"https://api.crossref.org/works/{doi}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        string json = await response.Content.ReadAsStringAsync();

        return JObject.Parse(json)["message"] as JObject;
    }

    private JObject BuildMetadataFromCrossRef(JObject data, string doi)
    {
        var authors = string.Join(", ",
            data["author"]?.Select(a => $"{a["given"]} {a["family"]}") ?? new string[] { });

        var affiliations = data["author"]?
            .Select(a => a["affiliation"]?.FirstOrDefault()?["name"]?.ToString() ?? "Unknown")
            .ToList() ?? new List<string> { "Unknown" };

        return new JObject
        {
            ["title"] = data["title"]?.FirstOrDefault() ?? "Unknown",
            ["authors"] = string.IsNullOrWhiteSpace(authors) ? "Unknown" : authors,
            ["affiliations"] = new JArray(affiliations),
            ["abstract"] = data["abstract"] ?? "",
            ["publisher"] = data["publisher"] ?? "Unknown",
            ["publication_date"] = data["published"]?["date-parts"]?[0]?[0] ?? "Unknown",
            ["journal"] = data["container-title"]?.FirstOrDefault() ?? "Unknown",
            ["doi"] = doi,
            ["open_access"] = (data["is-referenced-by-count"]?.Value<int>() ?? 0) > 0,
            ["citation_count"] = data["is-referenced-by-count"] ?? 0
        };
    }

    private void SaveMetadata(JObject metadata, int uploadId, string connectionString)
    {
        const string sql = "UPDATE tbl_pdf_uploads SET metadata = @result WHERE pdf_uploaded_id = @id;";

        using var conn = new NpgsqlConnection(connectionString);
        conn.Open();

        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("result", NpgsqlTypes.NpgsqlDbType.Jsonb, metadata);
        cmd.Parameters.AddWithValue("id", uploadId);

        cmd.ExecuteNonQuery();
    }

    public async Task ExtractMetadataAsync(Logger logger, string pdfPath, string _connectionStrings, string doi, int upload_id)
    {
        doi = doi.Trim().TrimEnd('.');
        var pdfextract = new DirectPdfMetadataExtractor(pdfPath); // not using now
         
        JObject metadata = null;

        try
        {
            var data = await FetchUnpaywallDataAsync(doi);
            metadata = BuildMetadataFromUnpaywall(data, doi);

            if (metadata != null)
            {
                SaveMetadata(metadata, upload_id, _connectionStrings);
            }
        }
        catch (Exception ex)
        {
            logger.Warn($"Unpaywall error: {ex.Message}. Trying CrossRef...");
            try
            {
                var data = await FetchCrossRefDataAsync(doi);
                metadata = BuildMetadataFromCrossRef(data, doi);
                if (metadata != null)
                {
                    SaveMetadata(metadata, upload_id, _connectionStrings);
                }

                logger.Info($"Metadata (CrossRef): {metadata}");
                 
            }
            catch (Exception ex2)
            {
                logger.Warn($"CrossRef error: {ex2.Message}."); 
            }
        }
    }
}