using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using NLog;
using Pipelines.Sockets.Unofficial.Arenas;
using SautinSoft;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.DataAccess;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using System.Security.Claims;
using System.Text.Json;
//using DocumentFormat.OpenXml.Office.SpreadSheetML.Y2023.DataSourceVersioning;
//using DocumentFormat.OpenXml.Wordprocessing;


namespace Scholarly.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PDFController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private readonly IPDFHelper _PDFHelper;
        private readonly IGeminiService _GeminiService;
        private readonly IMetadataService _metaDataService; 
        private readonly string _ConnectionStrings;
        public CurrentContext _currentContext;
        private readonly IPdfDa _IPdfDa;
        private static Logger _logger = LogManager.GetCurrentClassLogger();
        public PDFController(IWebHostEnvironment env, IConfiguration configuration, SWBDBContext swbDBContext, IPDFHelper pDFHelper, IPdfDa iPdfDa, IHttpContextAccessor httpContextAccessor, IGeminiService GeminiService, IMetadataService MetaDataService)
        {
            _env = env;
            _config = configuration;
            _swbDBContext = swbDBContext;
            _PDFHelper = pDFHelper;
            _IPdfDa = iPdfDa;
            _GeminiService = GeminiService;
            _metaDataService = MetaDataService;
            _currentContext = Common.GetCurrentContext(httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
            _ConnectionStrings =Convert.ToString(configuration["ConnectionStrings:DefaultConnection"]);
        }

        [HttpPost]
        [Route("addgroup")]
        public ActionResult AddGroup(string UserId, string GroupName, string TagsText)
        {
            return Ok(_IPdfDa.AddGroup(_swbDBContext, _logger, UserId, GroupName, TagsText));
        }

        [HttpGet]
        [Route("loadgroups")]
        public ActionResult LoadGroups(string UserId)
        {

            return Ok(_IPdfDa.LoadGroups(_swbDBContext, _logger, UserId));
        }

        [HttpPost]
        [Route("addnewmail")]
        public ActionResult Addnewemail(string UserId, string newEmail, int GroupId)
        {

            return Ok(_IPdfDa.AddNewEmail(_swbDBContext, _logger, UserId, newEmail, GroupId));
        }
        [HttpGet]
        [Route("contactlistpdf2")]
        public ActionResult ContactListPDF2()
        {
            ActionResult fileContentResult;
            try
            {
                byte[] file = _PDFHelper.GetFile(_PDFHelper.GetFilePath(3, _swbDBContext));
                if (file == null)
                {
                    fileContentResult = null;
                }
                else
                {
                    fileContentResult = new FileContentResult(file, "application/pdf");
                }
            }
            catch (Exception exception)
            {
                Console.WriteLine(exception);
                fileContentResult = null;
            }
            return fileContentResult;
        }

        //[HttpGet]
        //[Route("getpdfpath")]
        //public ActionResult GetPDFPath(int PathId)
        //{

        //    return Ok(_IPdfDa.GetPDFPath(_swbDBContext, _logger, PathId));

        //}
        [HttpPost]
        [Route("deleteemail")]
        public ActionResult deleteemail(string UserId, int GroupEmailId)
        {
            return Ok(_IPdfDa.DeleteEmail(_swbDBContext, _logger, UserId, GroupEmailId));
        }

        [HttpPost]
        [Route("deletegroup")]
        public ActionResult deleteGroup(string UserId, int GroupId)
        {
            return Ok(_IPdfDa.DeleteGroup(_swbDBContext, _logger, UserId, GroupId));
        }

        [HttpPost]
        [Route("deletepdf")]
        public ActionResult DeletePdf(int UId)
        {
            return Ok(_IPdfDa.DeletePdf(_swbDBContext, _logger, UId));
        }

        [HttpPost]
        [Route("deletequestion")]
        public ActionResult DeleteQuestion(int QID)
        {
            return Ok(_IPdfDa.DeleteQuestion(_swbDBContext, _logger, QID));
        }

        [HttpPost]
        [Route("editpdf")]
        public IActionResult EditPdf(int UId)
        {
            JsonResult jsonResult;
            tbl_pdf_uploads? result = null;
            PDF pDF = new PDF(); ;
            try
            {
                result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == UId);
                if (result != null)
                {
                    pDF = new PDF();
                    // pDF.PDFUploadedId = (int?)result.pdf_uploaded_id;
                    pDF.DOINo = result.doi_number;
                    pDF.PUBMEDId = result.pub_med_id;
                    pDF.Article = result.article;
                    pDF.Author = result.author;
                    _swbDBContext.SaveChanges();
                }
            }
            catch (Exception exception)
            {
                throw exception;
            }
            return Ok(pDF);
        }
        [HttpGet]
        [Route("downloadpdf")]
        public async Task<string> DownloadPdf(string downloadLink, string storageLink)
        {
            string str;
            try
            {
                //using (WebClient webClient = new WebClient())
                //{
                //    webClient.DownloadFile(downloadLink, storageLink);
                //}

                /*webClient replaced with HttpClient to prevent obsolete  error in .Net 8 */

                using (HttpClient httpClient = new HttpClient())
                {
                    using (HttpResponseMessage response = await httpClient.GetAsync(downloadLink))
                    {
                        response.EnsureSuccessStatusCode();
                        using (var contentStream = await response.Content.ReadAsStreamAsync())
                        using (var fileStream = new FileStream(storageLink, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            await contentStream.CopyToAsync(fileStream);
                        }
                    }
                }
                str = storageLink;
            }
            catch (Exception exception)
            {
                throw exception;
            }
            return str;
        }

        [HttpPost]
        [Route("savefile")]
        public async Task<IActionResult> SaveUploadedFile([FromForm] FileDetail formval) //,[FromBody], 
        {
            ActionResult action;
            string result = "";
            string str = "";
            string str1 = "";
            List<PDF> pDFs = new List<PDF>();
            try
            {
                if (formval.url == "" && formval.file == null)
                {
                    str = "Please Select File or Enter Url.";
                }
                if (formval.article == "")
                {
                    str1 = "Please Enter Article Name.";
                }
                string str2 = string.Format("{0} \\n {1}", str, str1);
                if (!(str == "") || !(str1 == ""))
                {
                    result = str2;
                }
                else if (!string.IsNullOrWhiteSpace(formval.url))
                {
                    string str3 = Helper.Common.CreateDownloadFolders(_config.GetSection("AppSettings")["DownloadFolderPath"], _logger);
                    string str4 = string.Concat(formval.article, ".pdf");
                    string str5 = await this.DownloadPdf(formval.url, Path.Combine(str3, str4));

                    var tBLPDFUPLOAD = new tbl_pdf_uploads()
                    {
                        user_id = _currentContext.UserId.ToString(),
                        pdf_saved_path = str5,
                        pub_med_id = formval.pubmedid,
                        article = formval.article,
                        author = formval.author,
                        created_by = "1",
                        created_date = DateTime.UtcNow,
                        file_name = formval.author,
                        doi_number = formval.doi,
                        publisher = formval.publisher,
                        copyright_info = formval.copyright_info,
                        project_id = formval.project_id,
                        is_public = new bool?(false),
                        status = true
                    };
                    _swbDBContext.tbl_pdf_uploads.Add(tBLPDFUPLOAD);
                    _swbDBContext.SaveChanges();

                    return Ok("File Uploaded Successfully");
                }
                else if (formval.file != null && formval.file.Length > 0)
                {
                    string AI_HostedApp = _config.GetSection("AppSettings")["Summary_QA_app"]!;
                    string AI_Key = _config.GetSection("AppSettings")["Google_API_Key"]!;
                    string fileLength = formval.file.Length.ToString();
                    string rootPath = _env.ContentRootPath; //added for getting hosted location 
                    string fileName = Path.GetFileName(formval.file.FileName);
                    string configPath = Helper.Common.CreateDownloadFolders(_config.GetSection("AppSettings")["DownloadFolderPath"], _logger);
                    string uploadedPath = Path.Combine(rootPath, configPath);
                    if (fileName.Substring(fileName.Length - 3, 3) != "pdf")
                    {
                        result = "File Upload Failed, Select only PDF format files";
                    }
                    else
                    {
                        if (Directory.Exists(uploadedPath))
                        {
                            using (var fileContentStream = new MemoryStream())
                            {
                                await formval.file.CopyToAsync(fileContentStream);
                                fileContentStream.Position = 0; // Rewind!
                                System.IO.File.WriteAllBytes(Path.Combine(uploadedPath, fileName), fileContentStream.ToArray());
                            }



                            var tBLPDFUPLOAD1 = new tbl_pdf_uploads()
                            {
                                user_id = _currentContext.UserId.ToString(),
                                pdf_saved_path = Path.Combine(configPath, fileName),
                                pub_med_id = formval.pubmedid,
                                doi_number = formval.doi,
                                article = formval.article,
                                author = formval.author,
                                created_by = "1",
                                created_date = DateTime.UtcNow,
                                file_name = fileName,
                                publisher = formval.publisher,
                                copyright_info = formval.copyright_info,
                                project_id = formval.project_id,
                                status = true
                            };

                            #region SUMMARY OF UPLODADED FILE TO - tbl_pdf_summary_list

                            var pdf_summary = new tbl_pdf_summary_list()
                            {
                                pdf_uploaded_id = tBLPDFUPLOAD1.pdf_uploaded_id,
                                user_id = _currentContext.UserId,
                                orignial_version = true,
                                version_no = "v1",
                                active = true,
                                llm_model = "Gemini",
                                // pdf_summary_saved_path
                                created_date = DateTime.UtcNow,
                                created_by = _currentContext.UserId,
                                is_public = false,
                                status = true
                            };
                            tBLPDFUPLOAD1.lst_pdf_summary.Add(pdf_summary);

                            /*Extract summary using Gemini AI Service*/
                            //var geminiService = new GeminiService();
                            //var summarizedData = await geminiService.SummarizeTextAsync(tBLPDFUPLOAD1.pdf_saved_path, AI_Key);
                            #endregion


                            _swbDBContext.tbl_pdf_uploads.Add(tBLPDFUPLOAD1);
                            _swbDBContext.SaveChanges();


                            if (tBLPDFUPLOAD1.pdf_uploaded_id > 0)
                            {
                                var record = _swbDBContext.tbl_pdf_summary_list.FirstOrDefault(p => p.pdf_uploaded_id == tBLPDFUPLOAD1.pdf_uploaded_id);
                                if (record != null)
                                {
                                    Task.Run(async () =>
                                    {
                                        //_GeminiService.SummarizeTextAsync(_logger, _ConnectionStrings,tBLPDFUPLOAD1.pdf_saved_path, AI_Key, record.pdf_summary_id);
                                        _GeminiService.SummarizeText_QA_Async(_logger, _ConnectionStrings, AI_HostedApp, record.pdf_summary_id, tBLPDFUPLOAD1.pdf_uploaded_id);
                                    });

                                    Task.Run(async () =>
                                    {
                                       _metaDataService.ExtractMetadataAsync(_logger, tBLPDFUPLOAD1.pdf_saved_path, _ConnectionStrings, tBLPDFUPLOAD1.doi_number, tBLPDFUPLOAD1.pdf_uploaded_id);
                                    });
                                }
                            }
                        }
                        else
                        {
                            Directory.CreateDirectory(uploadedPath);
                        }
                        result = "File Uploaded Successfully";
                    }
                }

            }
            catch (Exception ex)
            {
                result = ex.Message;

            }
            return Ok(result);
        }

        [HttpGet]
        [Route("getsearchvalues")]
        public ActionResult getsearchvalues(string searchtext)
        {
            var tBLPDFUPLOADS = new List<tbl_pdf_uploads>();
            if (searchtext.Length > 0)
            {
                var searchKey = searchtext.ToLower();
                tBLPDFUPLOADS = _swbDBContext.tbl_pdf_uploads.Where(x => x.status == true && (x.article.ToLower().Contains(searchKey) || x.author.Contains(searchKey))).ToList();
            }
            else
            {
                tBLPDFUPLOADS = _swbDBContext.tbl_pdf_uploads.Where(x => x.status == true).Take(10).ToList();
            }
            return Ok(tBLPDFUPLOADS);
        }


        [HttpGet]
        [Route("tunseencomment")]
        public ActionResult GetUnSeenComments(int QuestionId)
        {
            return Ok("Not yet implemented");
        }


        [HttpGet]
        [Route("uploadedpdfslist")]
        public ActionResult GetUploadedPDFsList(int? ProjectId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                string str = _currentContext.UserId.ToString();
                pDFs = (
                    from P in _swbDBContext.tbl_pdf_uploads
                    where P.user_id == str && P.status == true && P.project_id == ProjectId
                    select new PDF()
                    {
                        PDFPath = P.pdf_saved_path,
                        PDFUploadedId = (int?)P.pdf_uploaded_id,
                        CreatedDate = P.created_date,
                        FileName = P.file_name,
                        PUBMEDId = P.pub_med_id,
                        Article = P.article,
                        DOINo = P.doi_number,
                        IsAccessed = (P.is_public == (bool?)true ? "Open Access" : "Closed Access"),
                        Author = P.author,
                        Publisher = P.publisher,
                        Copyright_info = P.copyright_info,
                        Metadata = P.metadata,
                        ProjectId = P.project_id,
                        Annotationscount = 9,  
                        QA = P.qa,
                        // Annotationscount = _swbDBContext.tbl_pdf_question_tags.Where(x=>x.status_id == true && x.user_id == str).Count(),
                        AnnotatedQuestions = _swbDBContext.tbl_pdf_question_tags.Where<tbl_pdf_question_tags>((tbl_pdf_question_tags x) => x.pdf_uploaded_id == (int?)P.pdf_uploaded_id).Select<tbl_pdf_question_tags, Questions>((tbl_pdf_question_tags q) => new Questions()
                        {
                            Question = q.question,
                            QuestionId = (int?)q.question_id,
                            likescount = (int?)_swbDBContext.tbl_annotation_ratings.Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)true).Count<tbl_annotation_ratings>(),
                            dislikescount = (int?)_swbDBContext.tbl_annotation_ratings.Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)false).Count<tbl_annotation_ratings>(),
                            Comments = _swbDBContext.tbl_comments.Where<tbl_comments>((tbl_comments x) => x.is_seen != (bool?)true && x.question_id == (int?)q.question_id).Select<tbl_comments, string>((tbl_comments x) => x.comment).FirstOrDefault<string>(),
                            CommentsCount = (int?)_swbDBContext.tbl_comments.Where<tbl_comments>((tbl_comments x) => x.is_seen != (bool?)true && x.question_id == (int?)q.question_id).Select<tbl_comments, string>((tbl_comments x) => x.comment).Count<string>()
                        })
                        .ToList<Questions>(),
                        PDFSummary = _swbDBContext.tbl_pdf_summary_list.Where(x => x.pdf_uploaded_id == (int?)P.pdf_uploaded_id).Select<tbl_pdf_summary_list, PDFSummary>((tbl_pdf_summary_list sum) => new PDFSummary()
                        {
                            is_public = sum.is_public,
                            orignial_version = sum.orignial_version,
                            pdf_summary_saved_path = sum.pdf_summary_saved_path,
                            summary = sum.summary,
                            version_no = sum.version_no
                        }).ToList<PDFSummary>()

                    }).ToList<PDF>();
            }
            catch (Exception exception)
            {
                throw exception;
            }

            return Ok(pDFs);
        }

        [HttpGet]
        [Route("pdftohtml")]
        public ActionResult? PDFTOHTML(int? uploadId)
        {
            try
            {
                if (_swbDBContext.tbl_pdf_uploads.Any(p => p.pdf_uploaded_id == uploadId))
                {
                    var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == uploadId);
                    if (result != null && !string.IsNullOrEmpty(result.pdf_saved_path))
                    {
                        string rootPath = _env.ContentRootPath; //added for getting hosted location 
                        // string htmlPath = System.IO.Path.ChangeExtension(result.pdf_saved_path, ".html"); //not using 
                        PdfFocus pdfFocu = new PdfFocus();
                        pdfFocu.HtmlOptions.IncludeImageInHtml = true;
                        pdfFocu.HtmlOptions.Title = result.article;
                        string fullPdfPath = Path.Combine(rootPath, result.pdf_saved_path);  //for getting the current location
                        pdfFocu.OpenPdf(fullPdfPath);
                        string html = "";
                        if (pdfFocu.PageCount > 0)
                        {
                            html = pdfFocu.ToHtml();
                        }
                        return base.Content(html, "text/html"); //chatgpt suggestion
                    }
                }
            }
            catch (Exception exception)
            {
                throw;
            }
            return null;
        }

        [HttpGet]
        [Route("getannotations")]
        public ActionResult GetAnnotations(int PID)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                pDFs = (
                    from q in _swbDBContext.tbl_pdf_question_tags
                    where !(bool)q.is_deleted && q.pdf_uploaded_id == (int?)PID
                    orderby q.user_id
                    select new PDF()
                    {
                        QuestionId = (int?)q.question_id,
                        UserId = q.user_id,
                        User_Name = _swbDBContext.tbl_users.Where<tbl_users>((tbl_users x) => x.userid.ToString() == q.user_id).Select<tbl_users, string>((tbl_users y) => y.firstname).FirstOrDefault<string>(),
                        QuestionTag = q.question,
                        Annotationscount = _swbDBContext.tbl_pdf_answers.Where<tbl_pdf_answers>((tbl_pdf_answers x) => x.question_id == (int?)q.question_id).Count<tbl_pdf_answers>(),
                        likescount = _swbDBContext.tbl_annotation_ratings.Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)true).Count<tbl_annotation_ratings>(),
                        Dislikescount = _swbDBContext.tbl_annotation_ratings.Where<tbl_annotation_ratings>((tbl_annotation_ratings x) => x.question_id == (int?)q.question_id && x.is_liked == (bool?)false).Count<tbl_annotation_ratings>(),
                        AnswersList = _swbDBContext.tbl_pdf_answers.Where<tbl_pdf_answers>((tbl_pdf_answers x) => x.question_id == (int?)q.question_id).Select<tbl_pdf_answers, Answers>((tbl_pdf_answers a) => new Answers()
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
                throw exception;
            }
            return Ok(pDFs);
        }


        [HttpGet]
        [Route("getanswers")]
        public ActionResult GetAnswers(int? QuestionId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                pDFs = (
                    from x in _swbDBContext.tbl_pdf_answers
                    where x.question_id == QuestionId
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
                throw exception;
            }
            return Ok(pDFs);
        }


        [HttpGet]
        [Route("getcommentsbasedonanswerid")]
        public ActionResult GetCommentsbasedonAnswerId(int AnswerId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                pDFs = (
                    from x in _swbDBContext.tbl_comments
                    where x.answer_id == (int?)AnswerId
                    select x into q
                    select new PDF()
                    {
                        AnswerId = q.answer_id,
                        Comment = q.comment
                    }).ToList<PDF>();
            }
            catch (Exception exception)
            {
                throw exception;
            }
            return Ok(pDFs);
        }

        [HttpGet]
        [Route("getpdfpath")]
        public ActionResult GetPDFPath(int? PathId)
        {
            PDF pDF = new PDF();
            try
            {
                if (_swbDBContext.tbl_pdf_uploads.Any(x => x.pdf_uploaded_id == PathId))
                {
                    var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(x => x.pdf_uploaded_id == PathId);
                    if (result != null)
                    {
                        pDF.PDFPath = result.pdf_saved_path;
                        pDF.IsAccessed = (result.is_public == (bool?)true ? "Open Access" : "Closed Access");
                    }
                }
            }
            catch (Exception exception)
            {
                throw exception;
            }

            return Ok(pDF);
        }

        [HttpGet]
        [Route("getuserdetails")]
        public ActionResult GetUserDetails(string UserId)
        {
            UserLogin? userLogin = new UserLogin();
            try
            {
                if (_swbDBContext.tbl_users.Any(p => p.userid.ToString() == UserId))
                {

                    userLogin = (
                        from x in _swbDBContext.tbl_users
                        where x.userid.ToString() == UserId
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
                        var result = _swbDBContext.tbl_user_specialization.FirstOrDefault(x => x.specialization_id == userLogin.SpecialzationId);
                        if (result != null)
                        {
                            userLogin.Specialzation = result.specialization;
                        }
                    }
                }
            }
            catch (Exception exception)
            {
                throw exception;
            }
            return Ok(userLogin);
        }

        [HttpGet]
        [Route("getuploadedpdf")]
        public async Task<IActionResult> DownloadPdf(int uploadId)
        {
            try
            {
                var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == uploadId);
                if (result != null && !string.IsNullOrEmpty(result.pdf_saved_path))
                {
                    string rootPath = _env.ContentRootPath; //added for getting hosted location 
                    string fullPdfPath = Path.Combine(rootPath, result.pdf_saved_path);
                    if (!System.IO.File.Exists(fullPdfPath))
                    {
                        return NotFound("PDF file not found.");
                    }

                    using (var fileStream = new FileStream(fullPdfPath, FileMode.Open, FileAccess.Read))
                    {
                        using (var memoryStream = new MemoryStream())
                        {
                            await fileStream.CopyToAsync(memoryStream);
                            var fileBytes = memoryStream.ToArray();
                            return File(fileBytes, "application/pdf");
                        }
                    }
                }
                else
                {
                    return NotFound("PDF file not found.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error reading PDF: {ex.Message}");
            }
        }
        [HttpPost]
        [Route("addproject")]
        public ActionResult AddProject(string Title, string Description)
        {
            return Ok(_IPdfDa.AddProject(_swbDBContext, _logger, _currentContext.UserId, Title, Description));
        }
        [HttpGet]
        [Route("allprojects")]
        public ActionResult LoadProjects()
        {
            return Ok(_IPdfDa.LoadProjects(_swbDBContext, _logger, _currentContext.UserId));
        }
        [HttpGet]
        [Route("getselectedproject")]
        public ActionResult GetProject(int ProjectId)
        {
            return Ok(_IPdfDa.GetProject(_swbDBContext, _logger, ProjectId));
        }
        [HttpPost]
        [Route("updateproject")]
        public ActionResult UpdateProject(Projects Project)
        {
            return Ok(_IPdfDa.UpdateProject(_swbDBContext, _logger, Project, _currentContext.UserId));
        }
        [HttpPost]
        [Route("deleteproject")]
        public ActionResult DeleteProject(int ProjectId)
        {
            return Ok(_IPdfDa.DeleteProject(_swbDBContext, _logger, ProjectId, _currentContext.UserId));
        }

    }
}


