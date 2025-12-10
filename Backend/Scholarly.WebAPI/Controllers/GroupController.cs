using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NLog;
using Scholarly.DataAccess;
using Scholarly.WebAPI.DataAccess;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using System.Security.Claims;

namespace Scholarly.WebAPI.Controllers
{
    /// <summary>
    /// Controller for managing user groups and group emails
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GroupController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IGroupDa _groupDa;
        private readonly CurrentContext _currentContext;
        private readonly ILogger<GroupController> _logger;
        private static Logger _nLogger = LogManager.GetCurrentClassLogger();

        public GroupController(
            SWBDBContext swbDBContext, 
            IGroupDa groupDa, 
            IHttpContextAccessor httpContextAccessor,
            ILogger<GroupController> logger)
        {
            _swbDBContext = swbDBContext;
            _groupDa = groupDa;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }

        /// <summary>
        /// Add a new group
        /// </summary>
        [HttpPost]
        [Route("add")]
        public ActionResult AddGroup(string GroupName, string TagsText)
        {
            _logger.LogInformation(
                "Adding group: {GroupName} for user {UserId}", 
                GroupName, 
                _currentContext.UserId);
            
            return Ok(_groupDa.AddGroup(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId, 
                GroupName, 
                TagsText));
        }

        /// <summary>
        /// Get all groups for current user
        /// </summary>
        [HttpGet]
        [Route("list")]
        public ActionResult LoadGroups()
        {
            _logger.LogInformation(
                "Loading groups for user {UserId}", 
                _currentContext.UserId);
            
            return Ok(_groupDa.LoadGroups(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId));
        }

        /// <summary>
        /// Add a new email to a group
        /// </summary>
        [HttpPost]
        [Route("email/add")]
        public ActionResult AddNewEmail(string newEmail, int GroupId)
        {
            _logger.LogInformation(
                "Adding email {Email} to group {GroupId} by user {UserId}", 
                newEmail, 
                GroupId, 
                _currentContext.UserId);
            
            return Ok(_groupDa.AddNewEmail(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId, 
                newEmail, 
                GroupId));
        }

        /// <summary>
        /// Delete an email from a group
        /// </summary>
        [HttpDelete]
        [Route("email/{groupEmailId}")]
        public ActionResult DeleteEmail(int groupEmailId)
        {
            _logger.LogInformation(
                "Deleting email {GroupEmailId} by user {UserId}", 
                groupEmailId, 
                _currentContext.UserId);
            
            return Ok(_groupDa.DeleteEmail(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId, 
                groupEmailId));
        }

        /// <summary>
        /// Delete a group
        /// </summary>
        [HttpDelete]
        [Route("{groupId}")]
        public ActionResult DeleteGroup(int groupId)
        {
            _logger.LogInformation(
                "Deleting group {GroupId} by user {UserId}", 
                groupId, 
                _currentContext.UserId);
            
            return Ok(_groupDa.DeleteGroup(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId, 
                groupId));
        }
    }
}

