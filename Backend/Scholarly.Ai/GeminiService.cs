
using System.Text;
using System.Text.Json;

public class GeminiService
{
    private readonly HttpClient _httpClient;

    public GeminiService()
    {
        _httpClient = new HttpClient();
    }

    public async Task<string> SummarizeTextAsync(string pdfPath, string apiKey)
    {
        string extractedText;
        using (FileStream stream = new FileStream(pdfPath, FileMode.Open, FileAccess.Read))
        {
            try
            {
                extractedText = FileProcessor.ExtractTextFromPdf(stream);
            }
            catch (Exception ex)
            {
                return string.Empty;
            }
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
            return jsonDoc.RootElement
                          .GetProperty("candidates")[0]
                          .GetProperty("content")
                          .GetProperty("parts")[0]
                          .GetProperty("text")
                          .GetString();
        }
    }
}