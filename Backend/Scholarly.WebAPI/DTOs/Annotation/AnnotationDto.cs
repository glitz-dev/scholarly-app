namespace Scholarly.WebAPI.DTOs.Annotation
{ 
    public class AnnotationDto
    {
        public long AnnotationID { get; set; }
        public int PdfUploadedID { get; set; }
        public int PageNo { get; set; } //which page is the uploaded pdf
        public required string AnnotatedText { get; set; }
        public string? Remarks { get; set; }
        public string? PriorityLevel { get; set; }  // do we need master for  this? 
        public string? HighlightColor { get; set; }
        public bool Inline { get; set; } = false;
        public string Rect { get; set; } = "{}"; //for canvas position in drawing cases
        public string Position { get; set; } = "{}"; //for positioning annotation in the pdf
        public int StartIndex { get; set; } // to pick the highlighted text position in a row
        public string llmResponse { get; set; } = "{}";
        public bool Status { get; set; } = true;
        
    }
}

