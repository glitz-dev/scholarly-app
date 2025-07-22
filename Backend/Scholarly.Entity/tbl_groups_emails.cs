using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_groups_emails
    {
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

        public string email
        {
            get;
            set;
        }

        [Key]
        public int group_email_id
        {
            get;
            set;
        }

        public int? group_id
        {
            get;
            set;
        }

        public bool? status
        {
            get;
            set;
        }
        public string? updated_by
        {
            get;
            set;
        }

        public DateTime? updated_date
        {
            get;
            set;
        }

        public string user_id
        {
            get;
            set;
        }
    }
}
