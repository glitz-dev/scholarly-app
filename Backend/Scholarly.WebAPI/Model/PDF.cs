using System.Xml.Linq;

namespace Scholarly.WebAPI.Model
{
    public class PDF
    {
        public List<Questions> AnnotatedQuestions
        {
            get;
            set;
        }

        public int? AnnotationCount
        {
            get;
            set;
        }

        public int Annotationscount
        {
            get;
            set;
        }

        public string Answer
        {
            get;
            set;
        }

        public int? AnswerId
        {
            get;
            set;
        }

        public List<Answers> AnswersList
        {
            get;
            set;
        }

        public string Article
        {
            get;
            set;
        }

        public int? ArticleCount
        {
            get;
            set;
        }

        public string Author
        {
            get;
            set;
        }

        public string Comment
        {
            get;
            set;
        }

        public int? CommentId
        {
            get;
            set;
        }

        public List<comments> Commentlist
        {
            get;
            set;
        }

        public DateTime? CreatedDate
        {
            get;
            set;
        }

        public int Dislikescount
        {
            get;
            set;
        }

        public string DOINo
        {
            get;
            set;
        }

        public string FileName
        {
            get;
            set;
        }

        public int? GroupsCount
        {
            get;
            set;
        }

        public string IsAccessed
        {
            get;
            set;
        }

        public bool IsFromPDF
        {
            get;
            set;
        }

        public bool IsPublic
        {
            get;
            set;
        }

        public int likescount
        {
            get;
            set;
        }

        public int? loginUserId
        {
            get;
            set;
        }

        public string PDFPath
        {
            get;
            set;
        }

        public int? PDFUploadedId
        {
            get;
            set;
        }

        public string PUBMEDId
        {
            get;
            set;
        }

        public int? QuestionId
        {
            get;
            set;
        }

        public string QuestionTag
        {
            get;
            set;
        }

        public string User_Name
        {
            get;
            set;
        }

        public int? UserCount
        {
            get;
            set;
        }

        public string UserId
        {
            get;
            set;
        }
    }
}
