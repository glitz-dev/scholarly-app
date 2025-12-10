using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;

namespace Scholarly.WebAPI.DataAccess
{
    /// <summary>
    /// Data access layer for Annotation and Question operations
    /// </summary>
    public interface IAnnotationDa
    {
        bool DeleteQuestion(SWBDBContext swbDBContext, Logger logger, int questionId);
    }

    public class AnnotationDa : IAnnotationDa
    {
        /// <summary>
        /// Delete a question/annotation (soft delete)
        /// </summary>
        public bool DeleteQuestion(SWBDBContext swbDBContext, Logger logger, int questionId)
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

                    logger.Info($"Question {questionId} deleted (soft delete)");
                }
                else
                {
                    logger.Warn($"Question {questionId} not found");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error deleting question {questionId}");
            }
            return success;
        }
    }
}

