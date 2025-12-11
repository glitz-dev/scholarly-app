using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Scholarly.Entity;

namespace Scholarly.DataAccess.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<tbl_users>
    {
        public void Configure(EntityTypeBuilder<tbl_users> builder)
        {
            builder.ToTable("tbl_users");
            
            builder.HasKey(u => u.userid);
            
            builder.Property(u => u.emailid)
                .IsRequired()
                .HasMaxLength(255);
            
            builder.Property(u => u.firstname)
                .IsRequired()
                .HasMaxLength(100);
            
            builder.Property(u => u.lastname)
                .IsRequired()
                .HasMaxLength(100);
            
            builder.Property(u => u.password)
                .IsRequired()
                .HasMaxLength(500);
            
            builder.Property(u => u.current_location)
                .HasMaxLength(200);
            
            builder.Property(u => u.current_position)
                .HasMaxLength(200);
            
            builder.Property(u => u.university)
                .HasMaxLength(200);
            
            builder.Property(u => u.specialization)
                .HasMaxLength(200);
            
            builder.Property(u => u.refresh_token)
                .HasMaxLength(500);
            
            // Indexes for performance
            builder.HasIndex(u => u.emailid)
                .IsUnique()
                .HasDatabaseName("IX_tbl_users_emailid");
            
            builder.HasIndex(u => u.refresh_token)
                .HasDatabaseName("IX_tbl_users_refresh_token");
            
            builder.HasIndex(u => u.specialization_id)
                .HasDatabaseName("IX_tbl_users_specialization_id");
        }
    }
}

