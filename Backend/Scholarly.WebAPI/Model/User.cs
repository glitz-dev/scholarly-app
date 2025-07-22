using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Scholarly.WebAPI.Model
{
    public class User
    {
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

        [Display(Name = "Email ID")]
        [Required(AllowEmptyStrings = false, ErrorMessage = "Email ID required")]
        public string EmailID
        {
            get;
            set;
        }

        public string FirstName
        {
            get;
            set;
        }

        public string? Gender
        {
            get;
            set;
        }

        public string LastName
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

        [Display(Name = "Remember Me")]
        public bool RememberMe
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
}
