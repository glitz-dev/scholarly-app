using System.ComponentModel.DataAnnotations;

namespace Scholarly.WebAPI.Model
{
    public class UserLogin
    {
        [Display(Name = "Email ID")]
        [Required(AllowEmptyStrings = false, ErrorMessage = "Email ID required")]
        public string EmailID
        {
            get;
            set;
        }

        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        [Required(AllowEmptyStrings = false, ErrorMessage = "Password required")]
        public string Password
        {
            get;
            set;
        }

        public string? FirstName
        {
            get;
            set;
        }

        public string? Gender
        {
            get;
            set;
        }

        public string? LastName
        {
            get;
            set;
        }
        [Display(Name = "Remember Me")]
        public bool RememberMe
        {
            get;
            set;
        }

        public string? CurrentLocation
        {
            get;
            set;
        }

        public string? CurrentPosition
        {
            get;
            set;
        }

        public string? Specialzation
        {
            get;
            set;
        }

        public int? SpecialzationId
        {
            get;
            set;
        }
        public string? University
        {
            get;
            set;
        }
    }

    public class AuthResponse
    {
        public bool status { get; set; }
        public string message { get; set; }
        public string emailId { get; set; }
        public string token { get; set; }
        public DateTime? expires { get; set; }
        public string refreshToken { get; set; }
    }
}
