using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Scholarly.Entity;

namespace Scholarly.DataAccess.Configurations
{
    public class PdfSummaryListConfiguration : IEntityTypeConfiguration<tbl_pdf_summary_list>
    {
        public void Configure(EntityTypeBuilder<tbl_pdf_summary_list> builder)
        {
            builder.ToTable("tbl_pdf_summary_list");
            
            builder.HasKey(s => s.pdf_summary_id);
            
            builder.Property(s => s.summary)
                .HasColumnType("jsonb");
            
            builder.Property(s => s.version_no)
                .HasMaxLength(50);
            
            builder.Property(s => s.llm_model)
                .HasMaxLength(100);
            
            builder.Property(s => s.pdf_summary_saved_path)
                .HasMaxLength(1000);
            
            // Indexes
            builder.HasIndex(s => s.pdf_uploaded_id)
                .HasDatabaseName("IX_tbl_pdf_summary_list_pdf_uploaded_id");
            
            builder.HasIndex(s => s.user_id)
                .HasDatabaseName("IX_tbl_pdf_summary_list_user_id");
            
            builder.HasIndex(s => new { s.pdf_uploaded_id, s.active })
                .HasDatabaseName("IX_tbl_pdf_summary_list_pdf_active");
        }
    }
}

