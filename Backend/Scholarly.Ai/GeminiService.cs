
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using NLog;
using Npgsql;
using Scholarly.DataAccess;
using System.Text;
using System.Text.Json;

public interface IGeminiService
{
    Task SummarizeTextAsync(Logger logger, string _connectionStrings, string pdfPath, string apiKey, int pdfSummaryId);
    Task SummarizeText_QA_Async(Logger logger, string _connectionStrings, string hostedApp, int pdfSummaryId, int upload_id);
}
public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private static Logger _logger;
    public GeminiService(SWBDBContext swbDBContext)
    {
        _httpClient = new HttpClient();
    }

    public async Task SummarizeTextAsync(Logger logger, string _connectionStrings, string pdfPath, string apiKey, int pdfSummaryId)
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

                var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
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
                if (!string.IsNullOrWhiteSpace(result))
                {
                    var sql = "UPDATE tbl_pdf_summary_list SET summary = @summary WHERE pdf_summary_id = @id;";
                    using var conn = new NpgsqlConnection(_connectionStrings);
                    {
                        conn.Open();
                        using var cmd = new NpgsqlCommand(sql, conn);
                        cmd.Parameters.AddWithValue("summary", NpgsqlTypes.NpgsqlDbType.Jsonb, JsonConvert.SerializeObject(result));
                        cmd.Parameters.AddWithValue("id", pdfSummaryId);
                        cmd.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
        }
    }

    public async Task SummarizeText_QA_Async(Logger logger, string _connectionStrings, string hostedApp, int pdfSummaryId, int upload_id)
    {
            try
            {
                var requestBody = new
                {
                    contents = new[]
                   {
                            new
                            {
                                parts = new[]
                                {
                                    new { storageKey = "thesis.pdf",
                                          projectId= "abc",
                                          documentId= "doc1",
                                          ocr= true,
                                          blip= false,
                                          userId= "test",
                                          password="test",
                                          useEncryption=false
                                        }
                                }
                            }
                        }
                };
                var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(hostedApp, content);
                //response.EnsureSuccessStatusCode();
                if (!response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Status: {response.StatusCode}");
                    Console.WriteLine("Response Body:");
                    Console.WriteLine(responseBody);
                }
                  var responseContent = await response.Content.ReadAsStringAsync();

                using var jsonDoc = JsonDocument.Parse(responseContent);
                var result = jsonDoc.RootElement;
                 string summary_result, qa_result;
                if (result.TryGetProperty("text_analysis", out JsonElement textAnalysis) && textAnalysis.TryGetProperty("summary", out JsonElement Summary))
                {
                    summary_result = Summary.GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(summary_result))
                    {
                        var sql = "UPDATE tbl_pdf_summary_list SET summary = @summary WHERE pdf_summary_id = @id;";
                        using var conn = new NpgsqlConnection(_connectionStrings);
                        {
                            conn.Open();
                            using var cmd = new NpgsqlCommand(sql, conn);
                            cmd.Parameters.AddWithValue("summary", NpgsqlTypes.NpgsqlDbType.Jsonb, JsonConvert.SerializeObject(summary_result));
                            cmd.Parameters.AddWithValue("id", pdfSummaryId);
                            cmd.ExecuteNonQuery();
                        }
                    }
                }

                if (result.TryGetProperty("question_responses", out JsonElement QA))
                {
                    qa_result = QA.GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(qa_result))
                    {
                        var sql = "UPDATE tbl_pdf_uploads SET qa = @qa WHERE pdf_uploaded_id = @id;";
                        using var conn = new NpgsqlConnection(_connectionStrings);
                        {
                            conn.Open();
                            using var cmd = new NpgsqlCommand(sql, conn);
                            cmd.Parameters.AddWithValue("qa", NpgsqlTypes.NpgsqlDbType.Jsonb, JsonConvert.SerializeObject(qa_result));
                            cmd.Parameters.AddWithValue("id", upload_id);
                            cmd.ExecuteNonQuery();
                        }
                    }
                } 
            }
            catch (Exception ex)
            {
                logger.Error(ex);
            }
        
    }
}