using System.Text.Json;
using System.Text.Json.Nodes;
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
    private async Task<JsonNode> FetchUnpaywallDataAsync(string doi)
    {
        string url = $"https://api.unpaywall.org/v2/{doi}?email={_unpaywallEmail}";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("User-Agent", $"PDFAnalyzer/1.0 (mailto:{_unpaywallEmail})");

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        string json = await response.Content.ReadAsStringAsync();

        return JsonNode.Parse(json);
    }

    private JsonObject BuildMetadataFromUnpaywall(JsonNode data, string doi)
    {
        var authors = string.Join(", ",
            data["z_authors"]?.AsArray().Select(a => a["raw_author_name"]?.ToString() ?? "") ?? new string[] { });

        var affiliations = data["z_authors"]?.AsArray()
            .Select(a => a["raw_affiliation_strings"]?.AsArray().FirstOrDefault()?.ToString() ?? "Unknown")
            .ToList() ?? new List<string> { "Unknown" };

        return new JsonObject
        {
            ["title"] = JsonValue.Create(data["title"]?.ToString() ?? "Unknown"),
            ["authors"] = JsonValue.Create(string.IsNullOrWhiteSpace(authors) ? "Unknown" : authors),
            ["affiliations"] = new JsonArray(affiliations.Select(a => JsonValue.Create(a)).ToArray()),
            ["abstract"] = JsonValue.Create(data["abstract"]?.ToString() ?? ""),
            ["publisher"] = JsonValue.Create(data["publisher"]?.ToString() ?? "Unknown"),
            ["publication_date"] = JsonValue.Create(data["published_date"]?.ToString() ?? "Unknown"),
            ["journal"] = JsonValue.Create(data["journal_name"]?.ToString() ?? "Unknown"),
            ["doi"] = JsonValue.Create(doi),
            ["open_access"] = JsonValue.Create((data["is_oa"]?.GetValue<bool>() ?? false)),
            ["citation_count"] = JsonValue.Create(data["is-referenced-by-count"]?.GetValue<int>() ?? 0)
        };
    }

    private async Task<JsonNode> FetchCrossRefDataAsync(string doi)
    {
        string url = $"https://api.crossref.org/works/{doi}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        string json = await response.Content.ReadAsStringAsync();

        return JsonNode.Parse(json)["message"] as JsonNode;
    }

    private JsonObject BuildMetadataFromCrossRef(JsonNode data, string doi)
    {
        var authors = string.Join(", ",
            data["author"]?.AsArray().Select(a => $"{a["given"]} {a["family"]}") ?? Array.Empty<string>());

        var affiliations = data["author"]?.AsArray()
            .Select(a => a["affiliation"]?.AsArray().FirstOrDefault()?["name"]?.ToString() ?? "Unknown")
            .ToList() ?? new List<string> { "Unknown" };

        return new JsonObject
        {
            ["title"] = JsonValue.Create(data["title"]?.ToString() ?? "Unknown"),
            ["authors"] = JsonValue.Create(string.IsNullOrWhiteSpace(authors) ? "Unknown" : authors),
            ["affiliations"] = new JsonArray(affiliations.Select(a=>JsonValue.Create(a)).ToArray()),
            ["abstract"] = JsonValue.Create(data["abstract"]?.ToString() ?? ""),
            ["publisher"] = JsonValue.Create(data["publisher"]?.ToString() ?? "Unknown"),
            ["publication_date"] = JsonValue.Create(data["published_date"]?.ToString() ?? "Unknown"),
            ["journal"] = JsonValue.Create(data["container-title"]?.ToString() ?? "Unknown"),
            ["doi"] = JsonValue.Create(doi),
            ["open_access"] = JsonValue.Create((data["is_oa"]?.GetValue<bool>() ?? false)),
            ["citation_count"] = JsonValue.Create(data["is-referenced-by-count"]?.GetValue<int>() ?? 0)
        };
    }

    private void SaveMetadata(JsonObject metadata, int uploadId, string connectionString)
    {

        var builder = new NpgsqlDataSourceBuilder(connectionString).EnableDynamicJson();
        var dataSource = builder.Build();

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
         
        JsonObject metadata = null;

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