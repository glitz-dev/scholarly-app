namespace Scholarly.WebAPI.Model
{
    public class Questions
    {
        public string Comments
        {
            get;
            set;
        }

        public int? CommentsCount
        {
            get;
            set;
        }

        public int? dislikescount
        {
            get;
            set;
        }

        public int? likescount
        {
            get;
            set;
        }

        public string Question
        {
            get;
            set;
        }

        public int? QuestionId
        {
            get;
            set;
        }

        public Questions()
        {
        }
    }
}
