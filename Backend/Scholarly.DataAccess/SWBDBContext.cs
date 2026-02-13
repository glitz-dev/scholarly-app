using Microsoft.EntityFrameworkCore;
using Scholarly.Entity;
using Scholarly.DataAccess.Configurations;

namespace Scholarly.DataAccess
{
    public class SWBDBContext : DbContext
    {
        public DbSet<tbl_user_specialization> tbl_user_specialization { get; set; }
        public DbSet<tbl_users> tbl_users { get; set; }
        public DbSet<tbl_groups> tbl_groups { get; set; }
        public DbSet<tbl_groups_emails> tbl_groups_emails { get; set; }
        public DbSet<tbl_pdf_uploads> tbl_pdf_uploads { get; set; }
        public DbSet<tbl_pdf_question_tags> tbl_pdf_question_tags { get; set; }
        public DbSet<tbl_annotation_ratings> tbl_annotation_ratings { get; set; }
        public DbSet<tbl_comments> tbl_comments { get; set; }
        public DbSet<tbl_pdf_answers> tbl_pdf_answers { get; set; }
        public DbSet<tbl_pdf_summary_list> tbl_pdf_summary_list { get; set; }
        public DbSet<tbl_projects> tbl_projects { get; set; }

        public DbSet<tbl_annotation> tbl_annotation { get; set; }

        public SWBDBContext(DbContextOptions<SWBDBContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply all configurations from separate files
            modelBuilder.ApplyConfiguration(new UserConfiguration());
            modelBuilder.ApplyConfiguration(new PdfUploadConfiguration());
            modelBuilder.ApplyConfiguration(new PdfSummaryListConfiguration());
            modelBuilder.ApplyConfiguration(new ProjectConfiguration());
            modelBuilder.ApplyConfiguration(new PdfQuestionTagsConfiguration());

            // Apply configurations for remaining entities using convention
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SWBDBContext).Assembly);

            // Convert Columns to Json
            modelBuilder.Entity<tbl_annotation>(e =>
            {
                e.Property(x => x.rect).HasColumnType("jsonb");
                e.Property(x => x.position).HasColumnType("jsonb");
                e.Property(x => x.llm_response).HasColumnType("jsonb");
            });
        }
    }
}
