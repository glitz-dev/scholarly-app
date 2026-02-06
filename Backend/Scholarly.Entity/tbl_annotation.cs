using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    internal class tbl_annotation
    {
        [Key]
        public long annotation_id { get; set; }
        public int pdf_uploaded_id { get; set; }
        public int page_no { get; set; } //which page is the uploaded pdf
        public  required string annotated_text { get; set; }
        public string? remarks { get; set; }
        public string? priority_level { get; set; }  // do we need master for  this? 
        public string? highlight_color { get; set; }
        public bool inline { get; set; } = false;
        public string rect { get; set; } = "{}"; //for canvas position in drawing cases
        public string position { get; set; } = "{}"; //for positioning annotation in the pdf
        public int start_index { get; set; } // to pick the highlighted text position in a row
        public string llm_response { get; set; } = "{}";
        public bool status { get; set; } = true;
        public int created_by { get; set; }
        public DateTime created_date { get; set; }
        public int? updated_by { get; set; }
        public DateTime? updated_date { get; set; }
         

    }
}
