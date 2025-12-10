using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_pdf_summary_list
    {
        [Key]
        public int pdf_summary_id
        {
            get;
            set;
        }

        public int pdf_uploaded_id { get; set;}
        public tbl_pdf_uploads? Pdf_Uploads { get; set; }

        public int user_id { get; set; }
        public bool orignial_version { get; set; }
        public string version_no { get; set; } = "";
        public string summary { get; set; } = "{}";
        public bool? active { get; set; }
        public string? pdf_summary_saved_path { get; set; }
        public string? llm_model { get; set;}
        public DateTime created_date { get; set; }
        public int created_by { get; set; }
        public bool? is_public { get; set; }
        public bool status { get; set; }
        public DateTime? modified_date { get; set; }
        public int? modified_by { get; set; }
    }
}
