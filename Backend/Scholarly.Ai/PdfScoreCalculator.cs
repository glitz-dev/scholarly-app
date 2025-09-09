using System;
using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace Scholarly.Ai
{
    public static class ReadabilityCalculator
    {
        public static string ExtractTextFromPdf(string pdfPath)
        {
            var textBuilder = new StringBuilder();
            using (var document = PdfDocument.Open(pdfPath))
            {
                foreach (var page in document.GetPages())
                {
                    textBuilder.AppendLine(page.Text);
                }
            }
            return textBuilder.ToString();
        }
        public static double FleschKincaidGrade(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return 0;

            int sentenceCount = Regex.Matches(text, @"[.!?]").Count;
            int wordCount = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            int syllableCount = CountSyllables(text);

            if (sentenceCount == 0 || wordCount == 0)
                return 0;

            double wordsPerSentence = (double)wordCount / sentenceCount;
            double syllablesPerWord = (double)syllableCount / wordCount;

            return 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
        }
        private static int CountSyllables(string text)
        {
            var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            int syllableCount = 0;

            foreach (var word in words)
            {
                syllableCount += EstimateSyllables(word);
            }

            return syllableCount;
        }
        private static int EstimateSyllables(string word)
        {
            word = word.ToLower().Trim();

            if (word.Length <= 3)
                return 1;

            word = Regex.Replace(word, @"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "");
            word = Regex.Replace(word, @"^y", "");

            var matches = Regex.Matches(word, @"[aeiouy]{1,2}", RegexOptions.IgnoreCase);
            return Math.Max(matches.Count, 1);
        }
    }
}
