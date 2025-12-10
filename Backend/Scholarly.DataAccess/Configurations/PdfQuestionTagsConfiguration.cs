using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Scholarly.Entity;

namespace Scholarly.DataAccess.Configurations
{
    public class PdfQuestionTagsConfiguration : IEntityTypeConfiguration<tbl_pdf_question_tags>
    {
        public void Configure(EntityTypeBuilder<tbl_pdf_question_tags> builder)
        {
            builder.ToTable("tbl_pdf_question_tags");
            
            builder.HasKey(q => q.question_id);
            
            builder.Property(q => q.question)
                .IsRequired()
                .HasMaxLength(1000);
            
            builder.Property(q => q.user_id)
                .HasMaxLength(50);
            
            // Indexes
            builder.HasIndex(q => q.pdf_uploaded_id)
                .HasDatabaseName("IX_tbl_pdf_question_tags_pdf_uploaded_id");
            
            builder.HasIndex(q => q.user_id)
                .HasDatabaseName("IX_tbl_pdf_question_tags_user_id");
            
            builder.HasIndex(q => q.is_deleted)
                .HasDatabaseName("IX_tbl_pdf_question_tags_is_deleted");
            
            builder.HasIndex(q => new { q.pdf_uploaded_id, q.is_deleted })
                .HasDatabaseName("IX_tbl_pdf_question_tags_pdf_deleted");
        }
    }
}

