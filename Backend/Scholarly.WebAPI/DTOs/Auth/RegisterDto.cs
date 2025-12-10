namespace Scholarly.WebAPI.DTOs.Auth
{
    public class RegisterDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string EmailID { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? University { get; set; }
        public string? CurrentPosition { get; set; }
        public string? CurrentLocation { get; set; }
        public int? SpecializationId { get; set; }
    }
}

