using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;
using System.Text;

public static class FileProcessor
{
    public static string ExtractTextFromDocx(Stream fileStream)
    {
        using var wordDoc = WordprocessingDocument.Open(fileStream, false);
        var body = wordDoc.MainDocumentPart?.Document.Body;
        return body?.InnerText ?? string.Empty;
    }

    public static string ExtractTextFromPdf(Stream fileStream)
    {
        using var document = PdfDocument.Open(fileStream);
        var sb = new StringBuilder();

        foreach (var page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }

        return sb.ToString();
    }
}