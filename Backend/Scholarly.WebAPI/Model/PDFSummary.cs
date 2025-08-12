namespace Scholarly.WebAPI.Model
{
    public class PDFSummary
    {
        public PDFSummary()
        {

        }
        public bool orignial_version { get; set; }
        public string version_no { get; set; }
        public string summary { get; set; }
        public string? pdf_summary_saved_path { get; set; }
        public bool? is_public { get; set; }
        
    }
}
