using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_pdf_question_tags
    {
        [Key]
        public int question_id
        {
            get;
            set;
        }
        public string created_by
        {
            get;
            set;
        }

        public DateTime? creation_date
        {
            get;
            set;
        }

        public bool? is_deleted
        {
            get;
            set;
        }

        public int? ispublic
        {
            get;
            set;
        }

        public string notes
        {
            get;
            set;
        }

        public int? pdf_uploaded_id
        {
            get;
            set;
        }

        public string question
        {
            get;
            set;
        }

        public int? status_id
        {
            get;
            set;
        }

        public string tags
        {
            get;
            set;
        }

        public int? user_id
        {
            get;
            set;
        }
    }
}
