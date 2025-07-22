using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_pdf_uploads
    {
        public string article
        {
            get;
            set;
        }

        public string author
        {
            get;
            set;
        }

        public string created_by
        {
            get;
            set;
        }

        public DateTime? created_date
        {
            get;
            set;
        }

        public string doi_number
        {
            get;
            set;
        }

        public string file_name
        {
            get;
            set;
        }

        public string? html_content
        {
            get;
            set;
        }

        public bool? is_public
        {
            get;
            set;
        }

        public string pdf_saved_path
        {
            get;
            set;
        }
        [Key]
        public int pdf_uploaded_id
        {
            get;
            set;
        }

        public string pub_med_id
        {
            get;
            set;
        }

        public bool? status
        {
            get;
            set;
        }

        public string user_id
        {
            get;
            set;
        }
        public virtual ICollection<tbl_pdf_question_tags>? tbl_pdf_question_tags
        {
            get;
            set;
        }

    }
}
