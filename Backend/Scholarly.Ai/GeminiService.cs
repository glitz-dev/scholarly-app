
using Microsoft.Extensions.Logging;
using NLog;
using Scholarly.DataAccess;
using System.Text;
using System.Text.Json;

public interface IGeminiService
{
    Task SummarizeTextAsync(Logger logger, string pdfPath, string apiKey,int pdfSummaryId);
}
public class GeminiService: IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly SWBDBContext _swbDBContext;
    private static Logger _logger;
    public GeminiService(SWBDBContext swbDBContext)
    {
        _swbDBContext = swbDBContext;
        _httpClient = new HttpClient();
    }

    public async Task SummarizeTextAsync(Logger logger, string pdfPath, string apiKey, int pdfSummaryId)
    {
        string extractedText;
        using (FileStream stream = new FileStream(pdfPath, FileMode.Open, FileAccess.Read))
        {
            try
            {
                extractedText = FileProcessor.ExtractTextFromPdf(stream);
            
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                new
                {
                    parts = new[]
                    {
                        new { text = "Summarized Details:\n" + extractedText }
                    }
                }
            }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(endpoint, content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();

            using var jsonDoc = JsonDocument.Parse(responseContent);
            string result = jsonDoc.RootElement
                          .GetProperty("candidates")[0]
                          .GetProperty("content")
                          .GetProperty("parts")[0]
                          .GetProperty("text")
                          .GetString();
                if (string.IsNullOrWhiteSpace(result))
                {
                    var summaryRecord = _swbDBContext.tbl_pdf_summary_list.FirstOrDefault(p => p.pdf_summary_id == pdfSummaryId);
                    if (summaryRecord != null)
                    {
                        summaryRecord.summary = JsonSerializer.Serialize(result);

                    }
                }
            }
            catch (Exception ex)
            {
                logger.Error (ex);
            }
        }
    }
}