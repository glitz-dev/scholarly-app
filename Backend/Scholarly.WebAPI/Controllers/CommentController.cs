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
    /// Controller for managing comments on annotations
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CommentController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly CurrentContext _currentContext;
        private readonly ILogger<CommentController> _logger;
        private static Logger _nLogger = LogManager.GetCurrentClassLogger();

        public CommentController(
            SWBDBContext swbDBContext, 
            IHttpContextAccessor httpContextAccessor,
            ILogger<CommentController> logger)
        {
            _swbDBContext = swbDBContext;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }

        /// <summary>
        /// Get comments for a specific answer
        /// </summary>
        [HttpGet]
        [Route("answer/{answerId}")]
        public ActionResult GetCommentsByAnswer(int answerId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                _logger.LogInformation(
                    "Getting comments for answer {AnswerId} by user {UserId}", 
                    answerId, 
                    _currentContext.UserId);

                pDFs = (
                    from x in _swbDBContext.tbl_comments
                    where x.answer_id == (int?)answerId
                    select x into q
                    select new PDF()
                    {
                        AnswerId = q.answer_id,
                        Comment = q.comment
                    }).ToList<PDF>();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting comments for answer {AnswerId}", answerId);
                throw;
            }
            return Ok(pDFs);
        }
    }
}

