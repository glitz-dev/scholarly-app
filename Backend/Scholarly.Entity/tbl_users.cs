using System.ComponentModel.DataAnnotations;

namespace Scholarly.Entity
{
    public class tbl_users
    {
        public Guid? activationcode
        {
            get;
            set;
        }

        public string? current_location
        {
            get;
            set;
        }

        public string? current_position
        {
            get;
            set;
        }

        public DateTime? dateofbirth
        {
            get;
            set;
        }

        public string emailid
        {
            get;
            set;
        }

        public string firstname
        {
            get;
            set;
        }

        public short? gender
        {
            get;
            set;
        }

        public short? isemailverified
        {
            get;
            set;
        }

        public string? lastname
        {
            get;
            set;
        }

        public string password
        {
            get;
            set;
        }

        public int? specialization_id
        {
            get;
            set;
        }

        public string? specialization
        {
            get;
            set;
        }

        public string? university
        {
            get;
            set;
        }

        [Key]
        public int userid
        {
            get;
            set;
        }
    }
}
