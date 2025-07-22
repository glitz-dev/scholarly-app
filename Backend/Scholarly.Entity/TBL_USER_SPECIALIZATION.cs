using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Scholarly.Entity
{
    public class tbl_user_specialization
    {
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

        public string specialization
        {
            get;
            set;
        }

        [Key]
        public int specialization_id
        {
            get;
            set;
        }

        //public virtual ICollection<Tbl_Users> Tbl_Users
        //{
        //    get;
        //    set;
        //}

        //public TBL_USER_SPECIALIZATION()
        //{
        //    this.Tbl_Users = new HashSet<Tbl_Users>();
        //}
    }
}
