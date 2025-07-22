using System.ComponentModel.DataAnnotations;

namespace Scholarly.Entity
{
    public class tbl_pdf_answers
    {
        [Key]
        public long answer_id { get; set; }
        public string answer { get; set; } = string.Empty;
        public int question_id { get; set; }
        public string created_by { get; set; } = string.Empty;
        public DateTime? created_date { get; set; }
        public bool is_from_pdf { get; set; }
        public string start_index { get; set; } = string.Empty;
        public string end_index { get; set; } = string.Empty;
        public string horizontal_scroll { get; set; } = string.Empty;
        public string vertical_scroll { get; set; } = string.Empty;
    }
}
