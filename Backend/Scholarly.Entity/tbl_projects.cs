using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Scholarly.Entity
{

    public class tbl_projects
    {
        [Key]
        public int project_id
        {
            get;
            set;
        }
        public string title
        {
            get;
            set;
        }

        public string? description
        {
            get;
            set;
        }
        public int created_by
        {
            get;
            set;
        }
        public DateTime created_date
        {
            get;
            set;
        }

        public int updated_by
        {
            get;
            set;
        }

        public DateTime? updated_date
        {
            get;
            set;
        }

        public bool status
        {
            get;
            set;
        }
    }
}
