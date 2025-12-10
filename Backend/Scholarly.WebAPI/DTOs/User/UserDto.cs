namespace Scholarly.WebAPI.DTOs.User
{
    public class UserDto
    {
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string EmailID { get; set; } = string.Empty;
        public string? University { get; set; }
        public string? CurrentPosition { get; set; }
        public string? CurrentLocation { get; set; }
        public int? SpecializationId { get; set; }
        public string? Specialization { get; set; }
    }
}

