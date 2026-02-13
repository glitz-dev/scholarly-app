using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.Entity.DTO;
using Scholarly.WebAPI.DataAccess;
using Scholarly.WebAPI.DTOs.Annotation;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using System.Security.Claims;
using Scholarly.WebAPI.DataAccess;
using Scholarly.Ai;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace Scholarly.WebAPI.Controllers
{
    /// <summary>
    /// Controller for managing PDF annotations, questions, and answers
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AnnotationController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private readonly IAnnotationDa _annotationDa;
        private readonly IGeminiService _geminiService;
        private readonly CurrentContext _currentContext;
        private readonly ILogger<AnnotationController> _logger;

        public AnnotationController(
            SWBDBContext swbDBContext,
            IConfiguration configuration,
            IAnnotationDa annotationDa,
            IGeminiService geminiService,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AnnotationController> logger)
        {
            _swbDBContext = swbDBContext;
            _config = configuration;
            _annotationDa = annotationDa;
            _geminiService = geminiService;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
        }

        /// <summary>
        /// Get all annotations for a specific PDF
        /// </summary>
        [HttpGet]
        [Route("pdf/{pdfId}")]
        public ActionResult GetAnnotations(int pdfId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                _logger.LogInformation(
                    "Getting annotations for PDF {PdfId} by user {UserId}", 
                    pdfId, 
                    _currentContext.UserId);

                pDFs = (
                    from q in _swbDBContext.tbl_pdf_question_tags
                    where !(bool)q.is_deleted && q.pdf_uploaded_id == (int?)pdfId
                    orderby q.user_id
                    select new PDF()
                    {
                        QuestionId = (int?)q.question_id,
                        UserId = q.user_id.ToString(),
                        User_Name = _swbDBContext.tbl_users
                            .Where<tbl_users>((tbl_users x) => x.userid == q.user_id)
                            .Select<tbl_users, string>((tbl_users y) => y.firstname)
                            .FirstOrDefault<string>(),
                        QuestionTag = q.question,
                        Annotationscount = _swbDBContext.tbl_pdf_answers
                            .Where<tbl_pdf_answers>((tbl_pdf_answers x) => x.question_id == (int?)q.question_id)
                            .Count<tbl_pdf_answers>(),
                        likescount = _swbDBContext.tbl_annotation_ratings
                            .Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)true)
                            .Count<tbl_annotation_ratings>(),
                        Dislikescount = _swbDBContext.tbl_annotation_ratings
                            .Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)false)
                            .Count<tbl_annotation_ratings>(),
                        AnswersList = _swbDBContext.tbl_pdf_answers
                            .Where<tbl_pdf_answers>((tbl_pdf_answers x) => x.question_id == (int?)q.question_id)
                            .Select<tbl_pdf_answers, Answers>((tbl_pdf_answers a) => new Answers()
                            {
                                Answer = a.answer,
                                AnswerId = (int?)a.answer_id,
                                startIndex = a.start_index,
                                EndIndex = a.end_index,
                                horizontalscroll = a.horizontal_scroll,
                                verticalscroll = a.vertical_scroll
                            }).ToList<Answers>()
                    }).ToList<PDF>();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting annotations for PDF {PdfId}", pdfId);
                throw;
            }
            return Ok(pDFs);
        }

        /// <summary>
        /// Get answers for a specific question
        /// </summary>
        [HttpGet]
        [Route("answers/{questionId}")]
        public ActionResult GetAnswers(int questionId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                _logger.LogInformation(
                    "Getting answers for question {QuestionId} by user {UserId}", 
                    questionId, 
                    _currentContext.UserId);

                pDFs = (
                    from x in _swbDBContext.tbl_pdf_answers
                    where x.question_id == questionId
                    select x into q
                    select new PDF()
                    {
                        AnswerId = (int?)q.answer_id,
                        Answer = q.answer,
                        QuestionId = q.question_id
                    }).ToList<PDF>();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting answers for question {QuestionId}", questionId);
                throw;
            }
            return Ok(pDFs);
        }

        /// <summary>
        /// Delete a question/annotation
        /// </summary>
        [HttpDelete]
        [Route("question/{questionId}")]
        public ActionResult DeleteQuestion(int questionId)
        {
            _logger.LogInformation(
                "Deleting question {QuestionId} by user {UserId}", 
                questionId, 
                _currentContext.UserId);
            
            return Ok(_annotationDa.DeleteQuestion(_swbDBContext, questionId));
        }

        /// <summary>
        /// Get unseen comments for a question
        /// </summary>
        [HttpGet]
        [Route("comments/unseen/{questionId}")]
        public ActionResult GetUnSeenComments(int questionId)
        {
            _logger.LogInformation(
                "Getting unseen comments for question {QuestionId}", 
                questionId);
            
            return Ok("Not yet implemented");
        }


        [HttpPost]
        [Route("save")]
        public async Task<ActionResult<List<AnnotationResultDto>>> SaveAnnotation([FromBody] AnnotationDto annotation)
        {
            try
            {
                _logger.LogInformation(
                    "Annotation Result Processing Started for {annotation}",
                    annotation);

                #region SAVE ANNOTATION
                var annoationSaveResult= _annotationDa.SaveAnnotation(_swbDBContext, annotation, _currentContext.UserId);
                if (!annoationSaveResult) {
                    throw new Exception("Error while Saving annotation");
                }
                #endregion

                var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == annotation.PdfUploadedID);
                if (result != null && !string.IsNullOrEmpty(result.content))
                {
                    string aiHostedApp = _config.GetSection("AppSettings")["Summary_QA_app"]!;
                    var annotationProcessUrl = new Uri(new Uri(aiHostedApp.EndsWith("/") ? aiHostedApp : aiHostedApp + "/"), "get_annotations").ToString();

                    List<AnnotationResultDto> annotationResult = await _geminiService.AnnotationResult_Async(
                            annotationProcessUrl,
                            annotation.AnnotatedText,
                           result.content);

                    if (annotationResult == null)
                    {
                        return StatusCode(502, "AI service failed to return annotations");
                    }

                    return Ok(annotationResult);
                }

                return NotFound("No context found for processing annotation: " + annotation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing {annotation}", annotation);
                return StatusCode(500, $"Error processing {annotation}");
            }
        }
        [HttpGet]
        [Route("getannotationsaginstupload")]
        public ActionResult<List<AnnotationDto>> GetAnnotationListByUploadId(int uploadId)
        {
            try
            {
                var result = _annotationDa.GetAllAnnotationsById(_swbDBContext, uploadId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while Processing Annotation List");
                return StatusCode(500, $"Error while Processing Annotation List");
            }
        }
    }
}

