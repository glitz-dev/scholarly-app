namespace Scholarly.Entity.DTO 
{ 
    public class AnnotationResultDto
    {
        public required string Category { get; set; }
        public string Question { get; set; } = string.Empty;
        public string Evidence_Quote { get; set; } = string.Empty;
    }
}

