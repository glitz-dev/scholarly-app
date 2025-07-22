using Microsoft.EntityFrameworkCore;
using Scholarly.Entity;

namespace Scholarly.DataAccess
{
    public class SWBDBContext : DbContext
    {
        public DbSet<tbl_user_specialization> tbl_user_specialization
        {
            get;
            set;
        }
        
        public DbSet<tbl_users> tbl_users
        {
            get;
            set;
        }
        public DbSet<tbl_groups> tbl_groups
        {
            get;
            set;
        }
        public DbSet<tbl_groups_emails> tbl_groups_emails
        {
            get;
            set;
        }
        public DbSet<tbl_pdf_uploads> tbl_pdf_uploads
        {
            get;
            set;
        }
        public DbSet<tbl_pdf_question_tags> tbl_pdf_question_tags
        {
            get;
            set;
        }
        public DbSet<tbl_annotation_ratings> tbl_annotation_ratings
        {
            get;
            set;
        }
        public DbSet<tbl_comments> tbl_comments
        {
            get;
            set;
        }
        public DbSet<tbl_pdf_answers> tbl_pdf_answers
        {
            get;
            set;
        }
        public SWBDBContext(DbContextOptions<SWBDBContext> options) : base(options)
        {
        }
    }
}
