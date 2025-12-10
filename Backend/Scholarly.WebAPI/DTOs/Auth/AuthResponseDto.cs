namespace Scholarly.WebAPI.DTOs.Auth
{
    public class AuthResponseDto
    {
        public bool Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public string EmailId { get; set; } = string.Empty;
    }
}

