using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.DataAccess;
using Scholarly.WebAPI.DTOs.Common;
using Scholarly.WebAPI.DTOs.User;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using Scholarly.WebAPI.Services;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;

namespace Scholarly.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("allowAll")]
    public class UserController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private static Logger _logger = LogManager.GetCurrentClassLogger();
        private readonly IUserDa _IUserDa;
        private readonly IJWTAuthenticationManager _jWTAuthenticationManager;
        private readonly IUserService _userService;
        private readonly ILogger<UserController> _controllerLogger;
        private readonly CurrentContext _currentContext;

        public UserController(
            IConfiguration configuration, 
            SWBDBContext swbDBContext, 
            IUserDa iIUserDa, 
            IJWTAuthenticationManager jWTAuthenticationManager,
            IUserService userService,
            ILogger<UserController> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _config = configuration;
            _swbDBContext = swbDBContext;
            _IUserDa = iIUserDa;
            _jWTAuthenticationManager = jWTAuthenticationManager;
            _userService = userService;
            _controllerLogger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }
        [HttpGet]
        [Route("hello")]
        public string Hello()
        {
            return "Hello User";
        }

        [HttpPost]
        //[ValidateAntiForgeryToken]
        public async Task<ActionResult> Registration(User user)
        {
            bool flag = false;
            string str = "";
            if (!ModelState.IsValid)
            {
                return Ok("Invalid Request");
            }
            else
            {
                if (_swbDBContext.tbl_users.Any(p => p.emailid == user.EmailID))
                {
                    return Conflict(new { Warning = "Email already exist" });
                }
                user.Password = PasswordHasher.HashPassword(user.Password);
                tbl_users tblUser = await _IUserDa.Registration(_swbDBContext, user);
                Common.SendEmail(_logger,user.EmailID, tblUser.activationcode.ToString());
            }
            return Ok(new { Message = "New User: " + user.FirstName + " Created" });
        }
       
        [HttpGet]
        public async Task<IActionResult> ConfirmEmail(string token, string email)
        {
            return Ok(_IUserDa.ConfirmEmail(_swbDBContext, token, token));
        }

        [HttpPost]
        [Route("saveuserdetails")]
        public async Task<ActionResult> SaveUserDetails(int userId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname)
        {
            bool flag = false;
            try
            {

                flag = await _IUserDa.SaveUserDetails(_swbDBContext, userId, SpecilizationId, University, CurrentPosition, CurrentLocation, firstname, Lastname);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(flag);
        }

        [HttpPost]
        [Route("sendforgotpasswordemail")]
        public ActionResult SendForgotPasswordEmail(string Email)
        {
            string str = "";
            try
            {
                if ((
                    from x in _swbDBContext.tbl_users
                    where x.emailid == Email
                    select x.emailid).Count<string>() != 0)
                {
                    string str1 = string.Concat("https://scholarlybook.com/User/ResetPassword?EmailId=", Email);
                    string str2 = string.Concat("Hi ! <br/> Please Click the below link to reset your password.<br/> <br/>  <a href=\"", str1, "\" > <br/>Scholarly Web Book. </a> <br/> <br/> Thanks <br/> Scholarly Web Book .<br/>");
                    var appSettings = _config.GetSection("Appsetting");
                    string str3 = appSettings["MailServerName"].ToString();
                    string str4 = appSettings["SMTPUser"].ToString(); ;
                    NetworkCredential networkCredential = new NetworkCredential()
                    {
                        UserName = "pdfannotation@gmail.com",
                        Password = "pdf@annotate"
                    };
                    string str5 = "Reset Password";
                    string str6 = "pdfannotation@gmail.com";
                    string email = Email;
                    try
                    {
                        using (MailMessage mailMessage = new MailMessage(str6, email, str5, str2))
                        {
                            mailMessage.IsBodyHtml = true;
                            (new SmtpClient(str3)
                            {
                                EnableSsl = true,
                                DeliveryMethod = SmtpDeliveryMethod.Network,
                                UseDefaultCredentials = false,
                                Credentials = networkCredential,
                                Port = Convert.ToInt32(appSettings["MailServerPort"])
                            }).Send(mailMessage);
                        }
                    }
                    catch (FormatException formatException)
                    {
                        _logger.Error(formatException.Message);
                    }
                }
                else
                {
                    str = "Email does not Exist";
                }
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(str);
        }

        [HttpGet]
        [Route("feedback")]
        [Authorize]
        public ActionResult FeedBack()
        {
            tbl_users? tblUser = (
                from u in _swbDBContext.tbl_users
                where u.userid == _currentContext.UserId
                select u).FirstOrDefault<tbl_users>();
            
            return Ok(tblUser);
        }

        [HttpGet]
        [Route("getcounts")]
        public async Task<ActionResult> GetCounts()
        {
            try
            {
                return Ok(_IUserDa.GetCounts(_swbDBContext));
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return null;
        }

        [HttpGet]
        [Route("getspecializations")]
        public async Task<ActionResult> GetSpecializations()
        {

            List<UserLogin>? userLogins = null;
            try
            {
                userLogins=await _IUserDa.GetSpecializations(_swbDBContext);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(userLogins);
        }

        [HttpGet]
        [Route("getuserdetails")]
        [Authorize]
        public async Task<ActionResult> GetUserDetails()
        {
            UserLogin? userLogin = new UserLogin();
            
            try
            {
                userLogin = await _IUserDa.GetUserDetails(_swbDBContext, _currentContext.UserId);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(userLogin);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] TokenModel tokenModel)
        {
            if (tokenModel is null)
                return BadRequest("Invalid client request");

            var response = await _jWTAuthenticationManager.RefreshApi(tokenModel, _swbDBContext);
            
            // Handle null response when refresh token is invalid or expired
            if (response == null)
                return Unauthorized(new { Message = "Invalid or expired refresh token" });

            return Ok(response);
        }

        // === Modern User Profile Management Methods (using DTOs and Services) ===

        /// <summary>
        /// Get current authenticated user's profile
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> GetMyProfile()
        {
            _controllerLogger.LogInformation("Getting profile for authenticated user ID: {UserId}", 
                _currentContext.UserId);
            var user = await _userService.GetUserDetailsAsync(_currentContext.UserId);
            return Ok(user);
        }

        /// <summary>
        /// Update current authenticated user's profile
        /// </summary>
        [HttpPut("me")]
        [Authorize]
        public async Task<ActionResult> UpdateMyProfile([FromBody] UpdateUserDto updateDto)
        {
            _controllerLogger.LogInformation("Updating profile for authenticated user ID: {UserId}", 
                _currentContext.UserId);
            await _userService.UpdateUserDetailsAsync(_currentContext.UserId, updateDto);
            return Ok(new { Message = "Profile updated successfully" });
        }

        /// <summary>
        /// Get all specializations (public endpoint)
        /// </summary>
        [HttpGet("specializations")]
        public async Task<ActionResult<IEnumerable<SpecializationDto>>> GetAllSpecializations()
        {
            _controllerLogger.LogInformation("Getting all specializations");
            var specializations = await _userService.GetSpecializationsAsync();
            return Ok(specializations);
        }

        // === Admin Methods (for accessing other users' data) ===

        /// <summary>
        /// Admin: Get any user's details (Admin role required)
        /// </summary>
        [HttpGet("admin/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<UserDto>> GetUserDetailsAdmin(int userId)
        {
            _controllerLogger.LogInformation("Admin {AdminId} accessing user {UserId}", 
                _currentContext.UserId, userId);
            var user = await _userService.GetUserDetailsAsync(userId);
            return Ok(user);
        }

        /// <summary>
        /// Admin: Update any user's profile (Admin role required)
        /// </summary>
        [HttpPut("admin/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> UpdateUserAdmin(
            int userId,
            [FromBody] UpdateUserDto updateDto)
        {
            _controllerLogger.LogInformation("Admin {AdminId} updating user {UserId}", 
                _currentContext.UserId, userId);
            await _userService.UpdateUserDetailsAsync(userId, updateDto);
            return Ok(new { Message = "User profile updated successfully by admin" });
        }
    }
}
 
