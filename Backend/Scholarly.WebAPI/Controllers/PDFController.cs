using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NLog;
using SautinSoft;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.Entity.DTO;
using Scholarly.WebAPI.DataAccess;
using Scholarly.WebAPI.DTOs.Common;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using System.Security.Claims;

namespace Scholarly.WebAPI.Controllers
{
    /// <summary>
    /// Controller for PDF upload, management, and viewing operations
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PdfController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private readonly IPDFHelper _PDFHelper;
        private readonly IGeminiService _GeminiService;
        private readonly IMetadataService _metaDataService; 
        private readonly string _ConnectionStrings;
        private readonly CurrentContext _currentContext;
        private readonly IPdfDa _pdfDa;
        private readonly ILogger<PdfController> _logger;
        private static Logger _nLogger = LogManager.GetCurrentClassLogger();

        public PdfController(
            IWebHostEnvironment env, 
            IConfiguration configuration, 
            SWBDBContext swbDBContext, 
            IPDFHelper pDFHelper, 
            IPdfDa pdfDa, 
            IHttpContextAccessor httpContextAccessor, 
            IGeminiService geminiService, 
            IMetadataService metaDataService,
            ILogger<PdfController> logger)
        {
            _env = env;
            _config = configuration;
            _swbDBContext = swbDBContext;
            _PDFHelper = pDFHelper;
            _pdfDa = pdfDa;
            _GeminiService = geminiService;
            _metaDataService = metaDataService;
            _logger = logger;
            _currentContext = Common.GetCurrentContext(
                httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
            _ConnectionStrings = Convert.ToString(
                configuration["ConnectionStrings:DefaultConnection"]);
        }

        /// <summary>
        /// Legacy endpoint - for testing only
        /// </summary>
        [HttpGet]
        [Route("contactlistpdf2")]
        public ActionResult ContactListPDF2()
        {
            try
            {
                byte[] file = _PDFHelper.GetFile(_PDFHelper.GetFilePath(3, _swbDBContext));
                if (file == null)
                {
                    return NotFound("PDF file not found");
                }
                return new FileContentResult(file, "application/pdf");
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error retrieving contact PDF");
                return StatusCode(500, "Error retrieving PDF file");
            }
        }

        /// <summary>
        /// Delete a PDF
        /// </summary>
        [HttpDelete]
        [Route("{pdfId}")]
        public ActionResult DeletePdf(int pdfId)
        {
            _logger.LogInformation(
                "Deleting PDF {PdfId} by user {UserId}", 
                pdfId, 
                _currentContext.UserId);
            
            return Ok(_pdfDa.DeletePdf(_swbDBContext, _nLogger, pdfId));
        }

        /// <summary>
        /// Get PDF metadata for editing
        /// </summary>
        [HttpGet]
        [Route("edit/{pdfId}")]
        public IActionResult GetPdfForEdit(int pdfId)
        {
            PDF pDF = new PDF();
            try
            {
                _logger.LogInformation(
                    "Getting PDF {PdfId} for editing by user {UserId}", 
                    pdfId, 
                    _currentContext.UserId);

                var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == pdfId);
                if (result != null)
                {
                    pDF = new PDF
                    {
                        DOINo = result.doi_number,
                        PUBMEDId = result.pub_med_id,
                        Article = result.article,
                        Author = result.author
                    };
                }  
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting PDF {PdfId} for editing", pdfId);
                throw;
            }
            return Ok(pDF);
        }

        /// <summary>
        /// Download PDF from external URL to server
        /// </summary>
        [HttpGet]
        [Route("download-from-url")]
        public async Task<string> DownloadPdfFromUrl(string downloadLink, string storageLink)
        {
            try
            {
                _logger.LogInformation(
                    "Downloading PDF from {DownloadLink} to {StorageLink}", 
                    downloadLink, 
                    storageLink);

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
                return storageLink;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error downloading PDF from {DownloadLink}", downloadLink);
                throw;
            }
        }

        /// <summary>
        /// Upload a PDF file or download from URL
        /// </summary>
        [HttpPost]
        [Route("save")]
        public async Task<IActionResult> UploadFile([FromForm] FileDetail formval)
        {
            string result = "";
            try
            {
                _logger.LogInformation(
                    "Uploading PDF by user {UserId}, Article: {Article}", 
                    _currentContext.UserId, 
                    formval.article);

                // Validation
                if (string.IsNullOrWhiteSpace(formval.url) && formval.file == null)
                {
                    return BadRequest("Please select a file or enter a URL");
                }
                
                //if (string.IsNullOrWhiteSpace(formval.article))
                //{
                //    return BadRequest("Please enter an article name");
                //}

                // Handle URL download
                if (!string.IsNullOrWhiteSpace(formval.url))
                {
                    string downloadFolder = Helper.Common.CreateDownloadFolders(
                        _config.GetSection("AppSettings")["DownloadFolderPath"], 
                        _nLogger);
                    string fileName = string.Concat(formval.article, ".pdf");
                    string savedPath = await this.DownloadPdfFromUrl(formval.url, Path.Combine(downloadFolder, fileName));

                    var pdfUpload = new tbl_pdf_uploads()
                    {
                        user_id = _currentContext.UserId,
                        pdf_saved_path = savedPath,
                        pub_med_id = formval.pubmedid,
                        article = formval.article,
                        author = formval.author,
                        created_by = _currentContext.UserId,
                        created_date = DateTime.UtcNow,
                        file_name = fileName,
                        doi_number = formval.doi,
                        publisher = formval.publisher,
                        copyright_info = formval.copyright_info,
                        project_id = formval.project_id,
                        is_public = false,
                        status = true
                    };
                    _swbDBContext.tbl_pdf_uploads.Add(pdfUpload);
                    _swbDBContext.SaveChanges();

                    _logger.LogInformation(
                        "PDF uploaded from URL successfully: {PdfId}", 
                        pdfUpload.pdf_uploaded_id);

                    return Ok(new { Message = "File uploaded successfully", PdfId = pdfUpload.pdf_uploaded_id });
                }
                
                // Handle file upload
                if (formval.file != null && formval.file.Length > 0)
                {
                    string aiHostedApp = _config.GetSection("AppSettings")["Summary_QA_app"]!;
                    string rootPath = _env.ContentRootPath;
                    string fileName = Path.GetFileName(formval.file.FileName);
                    string physicalPath = _config.GetValue<string>("FileSettings:PhysicalFolderPath") ?? throw new InvalidOperationException("App Settings:PhysicalFolderPath is not configured .");
                    string configPath = Helper.Common.CreateDownloadFolders(physicalPath, _nLogger);
                    string uploadedPath = Path.Combine(rootPath, configPath);
                    
                    // Validate PDF extension
                    if (!fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest("File upload failed. Please select only PDF format files");
                    }
                    
                    if (!Directory.Exists(uploadedPath))
                    {
                        Directory.CreateDirectory(uploadedPath);
                    }

                    // Save file
                    using (var fileContentStream = new MemoryStream())
                    {
                        await formval.file.CopyToAsync(fileContentStream);
                        fileContentStream.Position = 0;
                        System.IO.File.WriteAllBytes(Path.Combine(uploadedPath, fileName), fileContentStream.ToArray());
                    }

                    var pdfUpload = new tbl_pdf_uploads()
                    {
                        user_id = _currentContext.UserId,
                        pdf_saved_path = fileName,
                        pub_med_id = formval.pubmedid,
                        doi_number = formval.doi,
                        article = formval.article,
                        author = formval.author,
                        created_by = _currentContext.UserId,
                        created_date = DateTime.UtcNow,
                        file_name = fileName,
                        publisher = formval.publisher,
                        copyright_info = formval.copyright_info,
                        project_id = formval.project_id,
                        status = true
                    };

                    // Create summary record
                    var pdfSummary = new tbl_pdf_summary_list()
                    {
                        pdf_uploaded_id = pdfUpload.pdf_uploaded_id,
                        user_id = _currentContext.UserId,
                        orignial_version = true,
                        version_no = "v1",
                        active = true,
                        llm_model = "Gemini",
                        created_date = DateTime.UtcNow,
                        created_by = _currentContext.UserId,
                        is_public = false,
                        status = true
                    };
                    pdfUpload.lst_pdf_summary.Add(pdfSummary);

                    _swbDBContext.tbl_pdf_uploads.Add(pdfUpload);
                    _swbDBContext.SaveChanges();

                    _logger.LogInformation(
                        "PDF uploaded successfully: {PdfId}, triggering AI processing", 
                        pdfUpload.pdf_uploaded_id);

                    string urlPath = physicalPath.Replace("wwwroot/", "/").Replace("wwwroot\\", "/");

                    // Trigger background AI processing
                    if (pdfUpload.pdf_uploaded_id > 0)
                    {
                        string downloadUrl = $"{Request.Scheme}://{Request.Host}{urlPath}/{pdfUpload.pdf_saved_path}";
                        var analyzeDataUrl = new Uri(new Uri(aiHostedApp.EndsWith("/") ? aiHostedApp : aiHostedApp + "/"), "analyze").ToString();
                        var conentExtractUrl = new Uri(new Uri(aiHostedApp.EndsWith("/") ? aiHostedApp : aiHostedApp + "/"), "extract_content").ToString();

                        var record = _swbDBContext.tbl_pdf_summary_list
                            .FirstOrDefault(p => p.pdf_uploaded_id == pdfUpload.pdf_uploaded_id);
                          
                        if (record != null)
                        {
                            // Fire and forget AI processing tasks
                            Task.Run(async () =>
                            {
                                _GeminiService.SummarizeText_QA_Async(
                                    _nLogger,
                                    _ConnectionStrings,
                                    analyzeDataUrl,
                                    record.pdf_summary_id,
                                    pdfUpload.pdf_uploaded_id,
                                   downloadUrl);
                            });

                            Task.Run(async () =>
                            {
                                _GeminiService.ContentExtract_Async(
                                    _nLogger,
                                    _ConnectionStrings,
                                    conentExtractUrl,
                                    pdfUpload.pdf_uploaded_id,
                                   downloadUrl);
                            });

                            Task.Run(async () =>
                            {
                                _metaDataService.ExtractMetadataAsync(
                                    _nLogger,
                                    Path.Combine(physicalPath, pdfUpload.pdf_saved_path),
                                    _ConnectionStrings,
                                    pdfUpload.doi_number,
                                    pdfUpload.pdf_uploaded_id);
                            });
                        }
                    }

                    return Ok(new 
                    { 
                        Message = "File uploaded successfully", 
                        PdfId = pdfUpload.pdf_uploaded_id 
                    });
                }

                
                return BadRequest("No file uploaded");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading PDF");
                return StatusCode(500, $"Error uploading PDF: {ex.Message}");
            }
        }

        /// <summary>
        /// Search PDFs by article or author name
        /// </summary>
        [HttpGet]
        [Route("search")]
        public ActionResult SearchPdfs(string searchText)
        {
            try
            {
                _logger.LogInformation(
                    "Searching PDFs with text: {SearchText}", 
                    searchText);

                var pdfUploads = new List<tbl_pdf_uploads>();
                
                if (!string.IsNullOrWhiteSpace(searchText) && searchText.Length > 0)
                {
                    var searchKey = searchText.ToLower();
                    pdfUploads = _swbDBContext.tbl_pdf_uploads
                        .Where(x => x.status == true && 
                               (x.article.ToLower().Contains(searchKey) || 
                                x.author.Contains(searchKey)))
                        .ToList();
                }
                else
                {
                    pdfUploads = _swbDBContext.tbl_pdf_uploads
                        .Where(x => x.status == true)
                        .Take(10)
                        .ToList();
                }
                
                return Ok(pdfUploads);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching PDFs");
                throw;
            }
        }

        /// <summary>
        /// Get list of uploaded PDFs for a project
        /// </summary>
        [HttpGet]
        [Route("uploadedpdfslist")]
        public ActionResult GetUploadedPDFsList(int? projectId)
        {
            List<PDF> pDFs = new List<PDF>();
            try
            {
                _logger.LogInformation(
                    "Getting PDFs list for user {UserId}, project {ProjectId}", 
                    _currentContext.UserId, 
                    projectId);

                int userId = _currentContext.UserId;
                pDFs = (
                    from P in _swbDBContext.tbl_pdf_uploads
                    where P.user_id == userId && P.status == true && P.project_id == projectId
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
                        AnnotatedQuestions = _swbDBContext.tbl_pdf_question_tags
                            .Where(x => x.pdf_uploaded_id == (int?)P.pdf_uploaded_id)
                            .Select(q => new Questions()
                            {
                                Question = q.question,
                                QuestionId = (int?)q.question_id,
                                likescount = (int?)_swbDBContext.tbl_annotation_ratings
                                    .Where(x => x.question_id == (int?)q.question_id && x.is_liked == (bool?)true)
                                    .Count(),
                                dislikescount = (int?)_swbDBContext.tbl_annotation_ratings
                                    .Where(x => x.question_id == (int?)q.question_id && x.is_liked == (bool?)false)
                                    .Count(),
                                Comments = _swbDBContext.tbl_comments
                                    .Where(x => x.is_seen != (bool?)true && x.question_id == (int?)q.question_id)
                                    .Select(x => x.comment)
                                    .FirstOrDefault(),
                                CommentsCount = (int?)_swbDBContext.tbl_comments
                                    .Where(x => x.is_seen != (bool?)true && x.question_id == (int?)q.question_id)
                                    .Select(x => x.comment)
                                    .Count()
                            })
                            .ToList(),
                        PDFSummary = _swbDBContext.tbl_pdf_summary_list
                            .Where(x => x.pdf_uploaded_id == (int?)P.pdf_uploaded_id)
                            .Select(sum => new PDFSummary()
                            {
                                is_public = sum.is_public,
                                orignial_version = sum.orignial_version,
                                pdf_summary_saved_path = sum.pdf_summary_saved_path,
                                summary = sum.summary,
                                version_no = sum.version_no
                            }).ToList()

                    }).ToList();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting PDFs list");
                throw;
            }

            return Ok(pDFs);
        }

        /// <summary>
        /// Convert PDF to HTML for viewing
        /// </summary>
        [HttpGet]
        [Route("pdftohtml/{uploadId}")]
        public ActionResult? ConvertToHtml(int uploadId)
        {
            try
            {
                _logger.LogInformation(
                    "Converting PDF {UploadId} to HTML for user {UserId}", 
                    uploadId, 
                    _currentContext.UserId);

                if (_swbDBContext.tbl_pdf_uploads.Any(p => p.pdf_uploaded_id == uploadId))
                {
                    var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == uploadId);
                    if (result != null && !string.IsNullOrEmpty(result.pdf_saved_path))
                    {
                        string rootPath = _env.ContentRootPath;
                        PdfFocus pdfFocus = new PdfFocus();
                        pdfFocus.HtmlOptions.IncludeImageInHtml = true;
                        pdfFocus.HtmlOptions.Title = result.article;
                        string fullPdfPath = Path.Combine(rootPath, result.pdf_saved_path);
                        pdfFocus.OpenPdf(fullPdfPath);
                        
                        string html = "";
                        if (pdfFocus.PageCount > 0)
                        {
                            html = pdfFocus.ToHtml();
                        }
                        
                        return Content(html, "text/html");
                    }
                }
                
                return NotFound("PDF not found");
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error converting PDF {UploadId} to HTML", uploadId);
                throw;
            }
        }

        /// <summary>
        /// Get PDF path information
        /// </summary>
        [HttpGet]
        [Route("getpdfpath/{pathId}")]
        public ActionResult GetPDFPath(int pathId)
        {
            PDF pDF = new PDF();
            try
            {
                _logger.LogInformation(
                    "Getting PDF path for {PathId}", 
                    pathId);

                if (_swbDBContext.tbl_pdf_uploads.Any(x => x.pdf_uploaded_id == pathId))
                {
                    var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(x => x.pdf_uploaded_id == pathId);
                    if (result != null)
                    {
                        pDF.PDFPath = result.pdf_saved_path;
                        pDF.IsAccessed = (result.is_public == (bool?)true ? "Open Access" : "Closed Access");
                    }
                }
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Error getting PDF path for {PathId}", pathId);
                throw;
            }

            return Ok(pDF);
        }

        /// <summary>
        /// Download/view PDF file
        /// </summary>
        [HttpGet]
        [Route("getuploadedpdf/{uploadId}")]
        public async Task<IActionResult> DownloadPdfFile(int uploadId)
        {
            try
            {
                _logger.LogInformation(
                    "Downloading PDF {UploadId} for user {UserId}", 
                    uploadId, 
                    _currentContext.UserId);

                var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == uploadId);
                if (result != null && !string.IsNullOrEmpty(result.pdf_saved_path))
                {
                    string rootPath = _env.ContentRootPath;
                    string physicalPath = _config.GetValue<string>("FileSettings:PhysicalFolderPath") ?? throw new InvalidOperationException("App Settings:PhysicalFolderPath is not configured .");
                    string fullPdfPath = Path.Combine(rootPath, physicalPath, result.pdf_saved_path);
                    
                    if (!System.IO.File.Exists(fullPdfPath))
                    {
                        _logger.LogWarning("PDF file not found at path: {Path}", fullPdfPath);
                        return NotFound("PDF file not found");
                    }

                    using (var fileStream = new FileStream(fullPdfPath, FileMode.Open, FileAccess.Read))
                    {
                        using (var memoryStream = new MemoryStream())
                        {
                            await fileStream.CopyToAsync(memoryStream);
                            var fileBytes = memoryStream.ToArray();
                            return File(fileBytes, "application/pdf", result.file_name ?? "document.pdf");
                        }
                    }
                }
                
                return NotFound("PDF file not found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading PDF {UploadId}", uploadId);
                return StatusCode(500, $"Error reading PDF: {ex.Message}");
            }
        }
        [HttpGet]
        [Route("getannotationresult/{uploadId}")]
        public async Task<ActionResult<List<AnnotationResultDto>>> AnnotationResult(int uploadId, string annotation)
        {
            try
            {
                _logger.LogInformation(
                    "Annotation Result Processing Started for {annotation}",
                    annotation);

                var result = _swbDBContext.tbl_pdf_uploads.FirstOrDefault(p => p.pdf_uploaded_id == uploadId);
                if (result != null && !string.IsNullOrEmpty(result.content))
                {
                    string aiHostedApp = _config.GetSection("AppSettings")["Summary_QA_app"]!;
                    var annotationProcessUrl = new Uri(new Uri(aiHostedApp.EndsWith("/") ? aiHostedApp : aiHostedApp + "/"), "get_annotations").ToString();
                    
                    List<AnnotationResultDto> annotationResult = await _GeminiService.AnnotationResult_Async(
                            _nLogger,
                            annotationProcessUrl,
                            annotation,
                           result.content);

                    if (annotationResult == null)
                    {
                        return StatusCode(502, "AI service failed to return annotations");
                    }

                    return Ok(annotationResult);
                }

                return NotFound("No context found for processing annotation: "+annotation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing {annotation}", annotation);
                return StatusCode(500, $"Error processing {annotation}");
            }
        }
    }
}


