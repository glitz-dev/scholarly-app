using Microsoft.Extensions.Logging;
using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Controllers;
using Scholarly.WebAPI.DTOs.Annotation;
using System;
using System.Text.Json;

namespace Scholarly.WebAPI.DataAccess
{
    /// <summary>
    /// Data access layer for Annotation and Question operations
    /// </summary>
    /// 
    
    
    public interface IAnnotationDa
    {
        bool DeleteQuestion(SWBDBContext swbDBContext, int questionId);
        bool SaveAnnotation(SWBDBContext swbDBContext, AnnotationDto annotation, int userId); 
        List<AnnotationDto> GetAllAnnotationsById(SWBDBContext swbDBContext, int uploadId);
    }

    public class AnnotationDa : IAnnotationDa
    {
        private readonly ILogger<AnnotationDa> _logger;
        public AnnotationDa(ILogger<AnnotationDa> logger)
        {
            _logger = logger;
        }

        public bool DeleteQuestion(SWBDBContext swbDBContext, int questionId)
        {
            bool success = false;
            try
            {
                var question = swbDBContext.tbl_pdf_question_tags
                    .FirstOrDefault(x => x.question_id == questionId);

                if (question != null)
                {
                    question.is_deleted = true;
                    swbDBContext.SaveChanges();
                    success = true;

                    _logger.LogInformation("Question {questionId} deleted (soft delete)", questionId);
                }
                else
                {
                    _logger.LogWarning("Question {questionId} has nothing to remove", questionId);
                }
            }
            catch (Exception)
            {
                _logger.LogError("Error deleting question {questionId}", questionId);
            }
            return success;
        }

        public bool SaveAnnotation(SWBDBContext swbDBContext, AnnotationDto annotation, int userId)
        {
            bool success = false;
            try
            {
                var annotationDtl = swbDBContext.tbl_annotation.FirstOrDefault(x => x.annotation_id == annotation.AnnotationID);

                var rectJson = JsonDocument.Parse(annotation.Rect.GetRawText());
                var positionJson = JsonDocument.Parse(annotation.Position.GetRawText());

                if (annotationDtl != null)
                {
                    annotationDtl.pdf_uploaded_id = annotation.PdfUploadedID;
                    annotationDtl.page_no = annotation.PageNo;
                    annotationDtl.annotated_text = annotation.AnnotatedText;
                    annotationDtl.remarks = annotation.Remarks;
                    annotationDtl.priority_level = annotation.PriorityLevel;
                    annotationDtl.highlight_color = annotation.HighlightColor;
                    annotationDtl.inline = annotation.Inline;
                    annotationDtl.rect = rectJson;
                    annotationDtl.position = positionJson;
                    annotationDtl.start_index = annotation.StartIndex;
                    annotationDtl.updated_date = DateTime.UtcNow;
                    annotationDtl.updated_by = userId;

                    _logger.LogInformation("Annotation {annotation.AnnotationID} updated", annotation.AnnotationID);
                }
                else
                {

                    var newAnnotation = new tbl_annotation()
                    {
                        pdf_uploaded_id = annotation.PdfUploadedID,
                        page_no = annotation.PageNo,
                        annotated_text = annotation.AnnotatedText,
                        remarks = annotation.Remarks,
                        priority_level = annotation.PriorityLevel,
                        highlight_color = annotation.HighlightColor,
                        inline = annotation.Inline,
                        rect = rectJson,
                        position = positionJson,
                        start_index = annotation.StartIndex,
                        status = true,
                        created_by = userId,
                        created_date = DateTime.UtcNow
                    };
                    swbDBContext.tbl_annotation.Add( newAnnotation );
                    _logger.LogInformation("New Annotation saved successfully");
                }
                swbDBContext.SaveChanges();
                success = true;
            }
            catch (Exception)
            {
                _logger.LogError("Error saving annotation");
            }
            return success;
        }

        public List<AnnotationDto> GetAllAnnotationsById(SWBDBContext swbDBContext, int uploadId)
        {
            try
            { 
                var annotationDtl = swbDBContext.tbl_annotation.Where(x => x.status && x.pdf_uploaded_id == uploadId).ToList();

                if (!annotationDtl.Any()) { 
                    return new List<AnnotationDto>();
                }

                var annotationList = annotationDtl.Select(x => new AnnotationDto
                {
                    AnnotationID = x.annotation_id,
                    PdfUploadedID = x.pdf_uploaded_id,
                    PageNo = x.page_no,
                    AnnotatedText = x.annotated_text,
                    Remarks = x.remarks,
                    PriorityLevel = x.priority_level,
                    HighlightColor = x.highlight_color,
                    Inline = x.inline,
                    StartIndex = x.start_index,
                    Rect = x.rect.RootElement,
                    Position = x.position.RootElement,
                    llmResponse = x.llm_response != null ? x.llm_response.RootElement: null
                }).ToList(); 
                return annotationList;

            }
            catch (Exception)
            {
                _logger.LogError("Error while reading annotation collection");
                return null;
                
            }
        }
    }
}

