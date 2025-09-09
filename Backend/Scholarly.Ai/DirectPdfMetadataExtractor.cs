namespace Scholarly.Ai
{
    public class DirectPdfMetadataExtractor
    {
        private readonly string pdfText;
        private readonly double readabilityScore;
        public DirectPdfMetadataExtractor(string pdfPath)
        {
            pdfText = ReadabilityCalculator.ExtractTextFromPdf(pdfPath);
            readabilityScore = ReadabilityCalculator.FleschKincaidGrade(pdfText);
        }
        public string PdfText => pdfText;
        public double ReadabilityScore => readabilityScore;
    }
}
