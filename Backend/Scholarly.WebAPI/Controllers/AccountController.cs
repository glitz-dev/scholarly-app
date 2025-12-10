using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Scholarly.WebAPI.DTOs.Auth;
using Scholarly.WebAPI.DTOs.User;
using Scholarly.WebAPI.Services;

namespace Scholarly.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("allowAll")]
    public class AccountController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<AccountController> _logger;

        public AccountController(
            IUserService userService,
            ILogger<AccountController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        /// <summary>
        /// User login endpoint
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            var response = await _userService.LoginAsync(loginDto);
            return Ok(response);
        }

        /// <summary>
        /// User registration endpoint
        /// </summary>
        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register([FromBody] RegisterDto registerDto)
        {
            var user = await _userService.RegisterAsync(registerDto);
            return Ok(user);
        }

        /// <summary>
        /// Confirm email endpoint
        /// </summary>
        [HttpGet("confirm-email")]
        public async Task<ActionResult> ConfirmEmail([FromQuery] string token, [FromQuery] string email)
        {
            await _userService.ConfirmEmailAsync(token, email);
            return Ok(new { Message = "Email confirmed successfully" });
        }
    }
}
