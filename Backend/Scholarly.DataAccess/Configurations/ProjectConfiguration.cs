using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Scholarly.Entity;

namespace Scholarly.DataAccess.Configurations
{
    public class ProjectConfiguration : IEntityTypeConfiguration<tbl_projects>
    {
        public void Configure(EntityTypeBuilder<tbl_projects> builder)
        {
            builder.ToTable("tbl_projects");
            
            builder.HasKey(p => p.project_id);
            
            builder.Property(p => p.title)
                .IsRequired()
                .HasMaxLength(300);
            
            builder.Property(p => p.description)
                .HasMaxLength(2000);
            
            // Indexes
            builder.HasIndex(p => p.created_by)
                .HasDatabaseName("IX_tbl_projects_created_by");
            
            builder.HasIndex(p => new { p.created_by, p.status })
                .HasDatabaseName("IX_tbl_projects_created_by_status");
            
            builder.HasIndex(p => p.created_date)
                .HasDatabaseName("IX_tbl_projects_created_date");
        }
    }
}

