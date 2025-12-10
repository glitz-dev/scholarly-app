using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.DataAccess
{
    /// <summary>
    /// Data access layer for PDF operations
    /// </summary>
    public interface IPdfDa
    {
        bool DeletePdf(SWBDBContext swbDBContext, Logger logger, int pdfId);
        PDF? GetPDFPath(SWBDBContext swbDBContext, Logger logger, int pathId);
    }

    public class PdfDa : IPdfDa
    {
        /// <summary>
        /// Delete a PDF and its associated summaries (soft delete)
        /// </summary>
        public bool DeletePdf(SWBDBContext swbDBContext, Logger logger, int pdfId)
        {
            bool success = false;
            try
            {
                var pdf = swbDBContext.tbl_pdf_uploads.Find(pdfId);
                if (pdf != null)
                {
                    // Soft delete associated summaries
                    var summaries = swbDBContext.tbl_pdf_summary_list
                        .Where(x => x.status == true && x.pdf_uploaded_id == pdfId)
                        .ToList();

                    if (summaries.Any())
                    {
                        foreach (var summary in summaries)
                        {
                            summary.status = false;
                            summary.modified_date = DateTime.UtcNow;
                            summary.modified_by = pdfId; // Note: This should be userId, but keeping existing logic
                        }
                    }

                    // Soft delete the PDF
                    pdf.status = false;
                    swbDBContext.SaveChanges();
                    success = true;

                    logger.Info($"PDF {pdfId} and {summaries.Count} associated summaries deleted");
                }
                else
                {
                    logger.Warn($"PDF {pdfId} not found");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error deleting PDF {pdfId}");
            }
            return success;
        }

        /// <summary>
        /// Get PDF path information
        /// </summary>
        public PDF? GetPDFPath(SWBDBContext swbDBContext, Logger logger, int pathId)
        {
            PDF? pdfInfo = null;
            try
            {
                pdfInfo = swbDBContext.tbl_pdf_uploads
                    .Where(x => x.pdf_uploaded_id == pathId)
                    .Select(q => new PDF()
                    {
                        PDFPath = q.pdf_saved_path,
                        IsAccessed = q.is_public == true ? "Open Access" : "Closed Access"
                    })
                    .FirstOrDefault();

                if (pdfInfo == null)
                {
                    logger.Warn($"PDF path not found for ID {pathId}");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error getting PDF path for ID {pathId}");
            }
            return pdfInfo;
        }
    }
}
