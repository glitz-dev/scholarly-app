using Scholarly.WebAPI.DTOs.Auth;
using Scholarly.WebAPI.DTOs.Common;
using Scholarly.WebAPI.DTOs.User;

namespace Scholarly.WebAPI.Services
{
    public interface IUserService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto login);
        Task<UserDto> RegisterAsync(RegisterDto registerDto);
        Task<bool> ConfirmEmailAsync(string token, string email);
        Task<bool> UpdateUserDetailsAsync(int userId, UpdateUserDto updateDto);
        Task<UserDto?> GetUserDetailsAsync(int userId);
        Task<IEnumerable<SpecializationDto>> GetSpecializationsAsync();
    }
}

