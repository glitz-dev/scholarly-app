using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_pdf_uploads
    {
        public tbl_pdf_uploads()
        {
            lst_pdf_summary = new List<tbl_pdf_summary_list>();
        }

        [Key]
        public int pdf_uploaded_id { get; set; }

        [ForeignKey("Tbl_projects")]
        public int? project_id { get; set; }
        public tbl_projects? Tbl_projects { get; set; }

        public string? article { get; set; }

        public string? author { get; set; }
        

        public int? created_by { get; set; }
         

        public DateTime? created_date { get; set; }
        

        public string doi_number { get; set; }
        

        public string file_name { get; set; }
        

        public string? html_content { get; set; }
        
        public bool? is_public { get; set; }
        
        public string pdf_saved_path { get; set; }
         

        public string? pub_med_id { get; set; }
        

        public bool? status { get; set; }
         

        public int? user_id { get; set; }
         
        public string? publisher { get; set; }
         
        public string? copyright_info { get; set; }
         
        public string metadata { get; set; } = "{}";
        public string qa { get; set; } = "{}";
        public string response { get; set; } = "{}";
        public string content { get; set; } = "{}";
        public virtual ICollection<tbl_pdf_question_tags>? tbl_pdf_question_tags //why define as collection?
        {
            get;
            set;
        }
        public virtual IList<tbl_pdf_summary_list>? lst_pdf_summary
        {
            get;
            set;
        }

    }
}
