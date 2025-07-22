namespace Scholarly.WebAPI.Model
{
    public class Groups
    {
        public DateTime? CreatedDate
        {
            get;
            set;
        }

        public int? GroupId
        {
            get;
            set;
        }

        public List<GroupEmails> Groupmails
        {
            get;
            set;
        }

        public string GroupName
        {
            get;
            set;
        }

        public int? Members
        {
            get;
            set;
        }
    }
}
