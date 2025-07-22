using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Scholarly.Entity
{

    public class tbl_groups
    {
        [Key]
        public int group_id
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

        public string group_name
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
