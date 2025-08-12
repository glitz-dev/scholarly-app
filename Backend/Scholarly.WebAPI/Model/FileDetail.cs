namespace Scholarly.WebAPI.Model
{
    public class FileDetail
    {
        public string article
        {
            get;
            set;
        }
        public string? url
        {
            get;
            set;
        }
        public string pubmedid
        {
            get;
            set;
        }

        public string author
        {
            get;
            set;
        }
        public string doi
        {
            get;
            set;
        }
        public string? publisher
        {
            get;
            set;
        }
        public string? copyright_info
        {
            get;
            set;
        }
        public IFormFile file { get; set; }
    }
}
