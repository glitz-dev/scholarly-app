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
    /// Controller for managing user projects
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProjectController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IProjectDa _projectDa;
        private readonly CurrentContext _currentContext;
        private readonly ILogger<ProjectController> _logger;
        private static Logger _nLogger = LogManager.GetCurrentClassLogger();

        public ProjectController(
            SWBDBContext swbDBContext, 
            IProjectDa projectDa, 
            IHttpContextAccessor httpContextAccessor,
            ILogger<ProjectController> logger)
        {
            _swbDBContext = swbDBContext;
            _projectDa = projectDa;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }

        /// <summary>
        /// Create a new project
        /// </summary>
        [HttpPost]
        [Route("add")]
        public ActionResult AddProject(string Title, string Description)
        {
            _logger.LogInformation(
                "Creating project: {Title} by user {UserId}", 
                Title, 
                _currentContext.UserId);
            
            return Ok(_projectDa.AddProject(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId, 
                Title, 
                Description));
        }

        /// <summary>
        /// Get all projects for current user
        /// </summary>
        [HttpGet]
        [Route("list")]
        public ActionResult LoadProjects()
        {
            _logger.LogInformation(
                "Loading projects for user {UserId}", 
                _currentContext.UserId);
            
            return Ok(_projectDa.LoadProjects(
                _swbDBContext, 
                _nLogger, 
                _currentContext.UserId));
        }

        /// <summary>
        /// Get a specific project by ID
        /// </summary>
        [HttpGet]
        [Route("{projectId}")]
        public ActionResult GetProject(int projectId)
        {
            _logger.LogInformation(
                "Getting project {ProjectId} by user {UserId}", 
                projectId, 
                _currentContext.UserId);
            
            return Ok(_projectDa.GetProject(
                _swbDBContext, 
                _nLogger, 
                projectId));
        }

        /// <summary>
        /// Update an existing project
        /// </summary>
        [HttpPut]
        [Route("update")]
        public ActionResult UpdateProject([FromBody] Projects project)
        {
            _logger.LogInformation(
                "Updating project {ProjectId} by user {UserId}", 
                project.ProjectId, 
                _currentContext.UserId);
            
            return Ok(_projectDa.UpdateProject(
                _swbDBContext, 
                _nLogger, 
                project, 
                _currentContext.UserId));
        }

        /// <summary>
        /// Delete a project
        /// </summary>
        [HttpDelete]
        [Route("{projectId}")]
        public ActionResult DeleteProject(int projectId)
        {
            _logger.LogInformation(
                "Deleting project {ProjectId} by user {UserId}", 
                projectId, 
                _currentContext.UserId);
            
            return Ok(_projectDa.DeleteProject(
                _swbDBContext, 
                _nLogger, 
                projectId, 
                _currentContext.UserId));
        }
    }
}

