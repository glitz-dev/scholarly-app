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
        public int? created_by
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

        public int? updated_by
        {
            get;
            set;
        }

        public DateTime? updated_date
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
