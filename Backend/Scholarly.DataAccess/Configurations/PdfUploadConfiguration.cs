using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Scholarly.Entity;

namespace Scholarly.DataAccess.Configurations
{
    public class PdfUploadConfiguration : IEntityTypeConfiguration<tbl_pdf_uploads>
    {
        public void Configure(EntityTypeBuilder<tbl_pdf_uploads> builder)
        {
            builder.ToTable("tbl_pdf_uploads");
            
            builder.HasKey(p => p.pdf_uploaded_id);
            
            builder.Property(p => p.user_id)
                .IsRequired()
                .HasMaxLength(50);
            
            builder.Property(p => p.file_name)
                .IsRequired()
                .HasMaxLength(500);
            
            builder.Property(p => p.pdf_saved_path)
                .IsRequired()
                .HasMaxLength(1000);
            
            builder.Property(p => p.article)
                .HasMaxLength(500);
            
            builder.Property(p => p.author)
                .HasMaxLength(500);
            
            builder.Property(p => p.doi_number)
                .IsRequired()
                .HasMaxLength(200);
            
            builder.Property(p => p.pub_med_id)
                .HasMaxLength(100);
            
            builder.Property(p => p.publisher)
                .HasMaxLength(300);
            
            builder.Property(p => p.copyright_info)
                .HasMaxLength(1000);
            
            builder.Property(p => p.created_by)
                .IsRequired()
                .HasMaxLength(50);
            
            builder.Property(p => p.metadata)
                .HasColumnType("jsonb")
                .HasDefaultValue("{}");
            
            builder.Property(p => p.qa)
                .HasColumnType("jsonb")
                .HasDefaultValue("{}");
            
            builder.Property(p => p.response)
                .HasColumnType("jsonb")
                .HasDefaultValue("{}");
            
            // Navigation properties
            builder.HasOne(p => p.Tbl_projects)
                .WithMany()
                .HasForeignKey(p => p.project_id)
                .OnDelete(DeleteBehavior.SetNull);
            
            builder.HasMany(p => p.tbl_pdf_question_tags)
                .WithOne()
                .HasForeignKey("pdf_uploaded_id")
                .OnDelete(DeleteBehavior.Cascade);
            
            builder.HasMany(p => p.lst_pdf_summary)
                .WithOne(s => s.Pdf_Uploads)
                .HasForeignKey(s => s.pdf_uploaded_id)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Indexes for performance
            builder.HasIndex(p => p.user_id)
                .HasDatabaseName("IX_tbl_pdf_uploads_user_id");
            
            builder.HasIndex(p => p.project_id)
                .HasDatabaseName("IX_tbl_pdf_uploads_project_id");
            
            builder.HasIndex(p => p.status)
                .HasDatabaseName("IX_tbl_pdf_uploads_status");
            
            builder.HasIndex(p => p.created_date)
                .HasDatabaseName("IX_tbl_pdf_uploads_created_date");
            
            builder.HasIndex(p => new { p.user_id, p.status })
                .HasDatabaseName("IX_tbl_pdf_uploads_user_status");
            
            builder.HasIndex(p => p.doi_number)
                .HasDatabaseName("IX_tbl_pdf_uploads_doi_number");
        }
    }
}

