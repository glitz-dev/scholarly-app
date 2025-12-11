using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using System.Security.Claims;

namespace Scholarly.WebAPI.Controllers
{
    /// <summary>
    /// Controller for managing user profile information
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserProfileController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly CurrentContext _currentContext;
        private readonly ILogger<UserProfileController> _logger;
        private static Logger _nLogger = LogManager.GetCurrentClassLogger();

        public UserProfileController(
            SWBDBContext swbDBContext, 
            IHttpContextAccessor httpContextAccessor,
            ILogger<UserProfileController> logger)
        {
            _swbDBContext = swbDBContext;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }

        /// <summary>
        /// Get user details by user ID
        /// </summary>
        [HttpGet]
        [Route("{userId}")]
        public ActionResult GetUserDetails(int userId)
        {
            UserLogin? userLogin = new UserLogin();
            try
            {
                _logger.LogInformation(
                    "Getting user details for {UserId}", 
                    userId);

                if (_swbDBContext.tbl_users.Any(p => p.userid == userId))
                {
                    userLogin = (
                        from x in _swbDBContext.tbl_users
                        where x.userid == userId
                        select x into q
                        select new UserLogin()
                        {
                            University = q.university,
                            FirstName = q.firstname,
                            LastName = q.lastname,
                            SpecialzationId = q.specialization_id,
                            CurrentPosition = q.current_position,
                            CurrentLocation = q.current_location,
                            EmailID = q.emailid,
                            Specialzation = q.specialization
                        }).FirstOrDefault<UserLogin>();

                    if (userLogin != null && userLogin.SpecialzationId > 0)
                    {
                        var result = _swbDBContext.tbl_user_specialization
                            .FirstOrDefault(x => x.specialization_id == userLogin.SpecialzationId);
                        
                        if (result != null)
                        {
                            userLogin.Specialzation = result.specialization;
                        }
                    }
                }
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting user details for {UserId}", userId);
                throw;
            }
            return Ok(userLogin);
        }

        /// <summary>
        /// Get current user's profile
        /// </summary>
        [HttpGet]
        [Route("me")]
        public ActionResult GetCurrentUserProfile()
        {
            return GetUserDetails(_currentContext.UserId);
        }
    }
}

