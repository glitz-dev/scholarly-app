# ACL (Access Control List) Implementation Plan

## Executive Summary

This document outlines the work required to implement a comprehensive Access Control List (ACL) system for the Scholarly application. Currently, the application has basic JWT authentication but lacks formal role-based access control and resource-level permissions.

**Estimated Effort:** 3-5 weeks (medium to large project)

---

## Current State Analysis

### ✅ What We Have:
- JWT authentication infrastructure in place
- Basic role check (`[Authorize(Roles = "Admin")]`) in UserController
- Ownership tracking via `user_id`, `created_by` fields across entities
- Basic `is_public` flag on PDFs and annotations
- Groups and group emails tables for basic collaboration features
- CurrentContext pattern for extracting user information from JWT

### ❌ What's Missing:
- No formal role system in the database
- No permission management framework
- No resource-level access control
- No granular sharing mechanisms
- No project-level collaboration controls

---

## Implementation Plan

## Phase 1: Database Schema Design (3-5 days)

### New Tables Required

#### 1.1 Roles Table
```sql
-- Core roles table
CREATE TABLE tbl_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,  
    -- Examples: 'SystemAdmin', 'ProjectOwner', 'Collaborator', 'Viewer'
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,  -- Prevent deletion of system roles
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES tbl_users(userid)
);

-- Indexes
CREATE INDEX idx_roles_name ON tbl_roles(role_name);
```

#### 1.2 User Roles (Many-to-Many)
```sql
-- Assigns global/system-level roles to users
CREATE TABLE tbl_user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES tbl_users(userid) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES tbl_roles(role_id) ON DELETE CASCADE,
    assigned_by INT REFERENCES tbl_users(userid),
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user ON tbl_user_roles(user_id);
CREATE INDEX idx_user_roles_role ON tbl_user_roles(role_id);
```

#### 1.3 Permissions Table
```sql
-- Defines all possible permissions in the system
CREATE TABLE tbl_permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,  
    -- Format: 'resource.action' e.g., 'pdf.read', 'pdf.edit', 'pdf.delete'
    resource_type VARCHAR(50) NOT NULL,  -- 'PDF', 'Project', 'Annotation', 'Comment'
    action VARCHAR(50) NOT NULL,  -- 'read', 'edit', 'delete', 'share', 'comment'
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_permissions_resource ON tbl_permissions(resource_type);
CREATE INDEX idx_permissions_name ON tbl_permissions(permission_name);
```

#### 1.4 Role Permissions (Many-to-Many)
```sql
-- Maps which permissions each role has
CREATE TABLE tbl_role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES tbl_roles(role_id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES tbl_permissions(permission_id) ON DELETE CASCADE,
    CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role ON tbl_role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON tbl_role_permissions(permission_id);
```

#### 1.5 Resource ACL (Core Access Control)
```sql
-- Grants specific users or groups access to specific resources
CREATE TABLE tbl_resource_acl (
    acl_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,  -- 'PDF', 'Project', 'Annotation', 'Comment'
    resource_id INT NOT NULL,
    user_id INT NULL REFERENCES tbl_users(userid) ON DELETE CASCADE,
    group_id INT NULL REFERENCES tbl_groups(group_id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES tbl_roles(role_id),
    granted_by INT REFERENCES tbl_users(userid),
    granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_inherited BOOLEAN DEFAULT false,  -- From parent resource (e.g., project)
    notes TEXT,
    
    -- Either user_id or group_id must be set
    CONSTRAINT check_user_or_group CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR 
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_acl_resource ON tbl_resource_acl(resource_type, resource_id);
CREATE INDEX idx_acl_user ON tbl_resource_acl(user_id);
CREATE INDEX idx_acl_group ON tbl_resource_acl(group_id);
CREATE INDEX idx_acl_role ON tbl_resource_acl(role_id);
CREATE INDEX idx_acl_composite ON tbl_resource_acl(resource_type, resource_id, user_id);
```

#### 1.6 Project Members (Project Collaboration)
```sql
-- Manages project-level access and collaboration
CREATE TABLE tbl_project_members (
    project_member_id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES tbl_projects(project_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES tbl_users(userid) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES tbl_roles(role_id),
    invited_by INT REFERENCES tbl_users(userid),
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'pending', 'removed'
    CONSTRAINT unique_project_member UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_members_project ON tbl_project_members(project_id);
CREATE INDEX idx_project_members_user ON tbl_project_members(user_id);
CREATE INDEX idx_project_members_status ON tbl_project_members(status);
```

#### 1.7 Audit Log for ACL Changes
```sql
-- Tracks all ACL changes for compliance and debugging
CREATE TABLE tbl_acl_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,  -- 'GRANT', 'REVOKE', 'MODIFY'
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT NOT NULL,
    target_user_id INT REFERENCES tbl_users(userid),
    target_group_id INT REFERENCES tbl_groups(group_id),
    role_id INT REFERENCES tbl_roles(role_id),
    performed_by INT REFERENCES tbl_users(userid),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB,  -- Store additional context
    ip_address VARCHAR(50)
);

-- Indexes
CREATE INDEX idx_acl_audit_resource ON tbl_acl_audit_log(resource_type, resource_id);
CREATE INDEX idx_acl_audit_user ON tbl_acl_audit_log(target_user_id);
CREATE INDEX idx_acl_audit_date ON tbl_acl_audit_log(performed_at);
```

### Modifications to Existing Tables

```sql
-- Add default role to users table
ALTER TABLE tbl_users 
    ADD COLUMN default_role_id INT REFERENCES tbl_roles(role_id),
    ADD COLUMN account_status VARCHAR(20) DEFAULT 'active';  -- 'active', 'suspended', 'inactive'

-- Enhance projects table with visibility settings
ALTER TABLE tbl_projects
    ADD COLUMN visibility VARCHAR(20) DEFAULT 'private',  -- 'private', 'team', 'public'
    ADD COLUMN owner_id INT REFERENCES tbl_users(userid);

-- Add ACL-related fields to PDF uploads
ALTER TABLE tbl_pdf_uploads
    ADD COLUMN access_level VARCHAR(20) DEFAULT 'private',  -- 'private', 'project', 'public'
    ADD COLUMN share_token VARCHAR(255) UNIQUE NULL;  -- For public sharing links

-- Create indexes on existing foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON tbl_pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_project_id ON tbl_pdf_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON tbl_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON tbl_groups(user_id);
```

---

## Phase 2: Entity Models (2-3 days)

### New Entity Classes

Create the following entity classes in `Scholarly.Entity`:

```csharp
// tbl_roles.cs
public class tbl_roles
{
    [Key]
    public int role_id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string role_name { get; set; }
    
    public string? description { get; set; }
    public bool is_system_role { get; set; }
    public DateTime created_date { get; set; }
    public int? created_by { get; set; }
    
    // Navigation properties
    public virtual ICollection<tbl_user_roles>? user_roles { get; set; }
    public virtual ICollection<tbl_role_permissions>? role_permissions { get; set; }
    public virtual ICollection<tbl_resource_acl>? resource_acls { get; set; }
}

// tbl_user_roles.cs
public class tbl_user_roles
{
    [Key]
    public int user_role_id { get; set; }
    
    public int user_id { get; set; }
    public int role_id { get; set; }
    public int? assigned_by { get; set; }
    public DateTime assigned_date { get; set; }
    public DateTime? expires_at { get; set; }
    
    // Navigation properties
    public virtual tbl_users? User { get; set; }
    public virtual tbl_roles? Role { get; set; }
}

// tbl_permissions.cs
public class tbl_permissions
{
    [Key]
    public int permission_id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string permission_name { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string resource_type { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string action { get; set; }
    
    public string? description { get; set; }
    public DateTime created_date { get; set; }
    
    // Navigation properties
    public virtual ICollection<tbl_role_permissions>? role_permissions { get; set; }
}

// tbl_role_permissions.cs
public class tbl_role_permissions
{
    [Key]
    public int role_permission_id { get; set; }
    
    public int role_id { get; set; }
    public int permission_id { get; set; }
    
    // Navigation properties
    public virtual tbl_roles? Role { get; set; }
    public virtual tbl_permissions? Permission { get; set; }
}

// tbl_resource_acl.cs
public class tbl_resource_acl
{
    [Key]
    public int acl_id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string resource_type { get; set; }
    
    public int resource_id { get; set; }
    public int? user_id { get; set; }
    public int? group_id { get; set; }
    public int role_id { get; set; }
    public int? granted_by { get; set; }
    public DateTime granted_date { get; set; }
    public DateTime? expires_at { get; set; }
    public bool is_inherited { get; set; }
    public string? notes { get; set; }
    
    // Navigation properties
    public virtual tbl_users? User { get; set; }
    public virtual tbl_groups? Group { get; set; }
    public virtual tbl_roles? Role { get; set; }
}

// tbl_project_members.cs
public class tbl_project_members
{
    [Key]
    public int project_member_id { get; set; }
    
    public int project_id { get; set; }
    public int user_id { get; set; }
    public int role_id { get; set; }
    public int? invited_by { get; set; }
    public DateTime joined_date { get; set; }
    
    [MaxLength(20)]
    public string status { get; set; } = "active";
    
    // Navigation properties
    public virtual tbl_projects? Project { get; set; }
    public virtual tbl_users? User { get; set; }
    public virtual tbl_roles? Role { get; set; }
}

// tbl_acl_audit_log.cs
public class tbl_acl_audit_log
{
    [Key]
    public long audit_id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string action { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string resource_type { get; set; }
    
    public int resource_id { get; set; }
    public int? target_user_id { get; set; }
    public int? target_group_id { get; set; }
    public int? role_id { get; set; }
    public int? performed_by { get; set; }
    public DateTime performed_at { get; set; }
    public string? details { get; set; }  // JSONB
    
    [MaxLength(50)]
    public string? ip_address { get; set; }
}
```

### Entity Configurations

Create configuration files in `Scholarly.DataAccess/Configurations`:

```csharp
// RoleConfiguration.cs
public class RoleConfiguration : IEntityTypeConfiguration<tbl_roles>
{
    public void Configure(EntityTypeBuilder<tbl_roles> builder)
    {
        builder.ToTable("tbl_roles");
        builder.HasKey(r => r.role_id);
        
        builder.Property(r => r.role_name)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.HasIndex(r => r.role_name)
            .IsUnique()
            .HasDatabaseName("idx_roles_name");
        
        builder.HasMany(r => r.user_roles)
            .WithOne(ur => ur.Role)
            .HasForeignKey(ur => ur.role_id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

// PermissionConfiguration.cs
public class PermissionConfiguration : IEntityTypeConfiguration<tbl_permissions>
{
    public void Configure(EntityTypeBuilder<tbl_permissions> builder)
    {
        builder.ToTable("tbl_permissions");
        builder.HasKey(p => p.permission_id);
        
        builder.Property(p => p.permission_name)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(p => p.resource_type)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.HasIndex(p => p.permission_name)
            .IsUnique()
            .HasDatabaseName("idx_permissions_name");
        
        builder.HasIndex(p => p.resource_type)
            .HasDatabaseName("idx_permissions_resource");
    }
}

// ResourceAclConfiguration.cs
public class ResourceAclConfiguration : IEntityTypeConfiguration<tbl_resource_acl>
{
    public void Configure(EntityTypeBuilder<tbl_resource_acl> builder)
    {
        builder.ToTable("tbl_resource_acl");
        builder.HasKey(a => a.acl_id);
        
        builder.Property(a => a.resource_type)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.user_id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(a => a.Group)
            .WithMany()
            .HasForeignKey(a => a.group_id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(a => a.Role)
            .WithMany(r => r.resource_acls)
            .HasForeignKey(a => a.role_id)
            .OnDelete(DeleteBehavior.Restrict);
        
        builder.HasIndex(a => new { a.resource_type, a.resource_id })
            .HasDatabaseName("idx_acl_resource");
        
        builder.HasIndex(a => a.user_id)
            .HasDatabaseName("idx_acl_user");
        
        builder.HasIndex(a => new { a.resource_type, a.resource_id, a.user_id })
            .HasDatabaseName("idx_acl_composite");
    }
}

// ProjectMemberConfiguration.cs
public class ProjectMemberConfiguration : IEntityTypeConfiguration<tbl_project_members>
{
    public void Configure(EntityTypeBuilder<tbl_project_members> builder)
    {
        builder.ToTable("tbl_project_members");
        builder.HasKey(pm => pm.project_member_id);
        
        builder.HasOne(pm => pm.Project)
            .WithMany()
            .HasForeignKey(pm => pm.project_id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(pm => pm.User)
            .WithMany()
            .HasForeignKey(pm => pm.user_id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasIndex(pm => new { pm.project_id, pm.user_id })
            .IsUnique()
            .HasDatabaseName("idx_project_members_unique");
        
        builder.HasIndex(pm => pm.project_id)
            .HasDatabaseName("idx_project_members_project");
        
        builder.HasIndex(pm => pm.user_id)
            .HasDatabaseName("idx_project_members_user");
    }
}
```

### Update DbContext

```csharp
// Add to SWBDBContext.cs
public DbSet<tbl_roles> tbl_roles { get; set; }
public DbSet<tbl_user_roles> tbl_user_roles { get; set; }
public DbSet<tbl_permissions> tbl_permissions { get; set; }
public DbSet<tbl_role_permissions> tbl_role_permissions { get; set; }
public DbSet<tbl_resource_acl> tbl_resource_acl { get; set; }
public DbSet<tbl_project_members> tbl_project_members { get; set; }
public DbSet<tbl_acl_audit_log> tbl_acl_audit_log { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Apply configurations
    modelBuilder.ApplyConfiguration(new RoleConfiguration());
    modelBuilder.ApplyConfiguration(new PermissionConfiguration());
    modelBuilder.ApplyConfiguration(new ResourceAclConfiguration());
    modelBuilder.ApplyConfiguration(new ProjectMemberConfiguration());
    // ... existing configurations
}
```

---

## Phase 3: Authorization Infrastructure (5-7 days)

### 3.1 DTOs for Authorization

```csharp
// Scholarly.WebAPI/DTOs/Authorization/RoleDto.cs
public class RoleDto
{
    public int RoleId { get; set; }
    public string RoleName { get; set; }
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public List<PermissionDto>? Permissions { get; set; }
}

// PermissionDto.cs
public class PermissionDto
{
    public int PermissionId { get; set; }
    public string PermissionName { get; set; }
    public string ResourceType { get; set; }
    public string Action { get; set; }
    public string? Description { get; set; }
}

// ResourceAccessDto.cs
public class ResourceAccessDto
{
    public string ResourceType { get; set; }
    public int ResourceId { get; set; }
    public int? UserId { get; set; }
    public int? GroupId { get; set; }
    public string RoleName { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

// AccessCheckResultDto.cs
public class AccessCheckResultDto
{
    public bool HasAccess { get; set; }
    public string? Reason { get; set; }
    public List<string> Permissions { get; set; }
}
```

### 3.2 Authorization Service Interface

```csharp
// Scholarly.WebAPI/Services/IAuthorizationService.cs
public interface IAuthorizationService
{
    /// <summary>
    /// Check if user has a specific permission for a resource
    /// </summary>
    Task<bool> HasPermissionAsync(int userId, string resourceType, int resourceId, string permission);
    
    /// <summary>
    /// Check if user is the owner of a resource
    /// </summary>
    Task<bool> IsResourceOwnerAsync(int userId, string resourceType, int resourceId);
    
    /// <summary>
    /// Get all permissions a user has (global + resource-specific)
    /// </summary>
    Task<IEnumerable<string>> GetUserPermissionsAsync(int userId);
    
    /// <summary>
    /// Get all roles assigned to a user
    /// </summary>
    Task<IEnumerable<string>> GetUserRolesAsync(int userId);
    
    /// <summary>
    /// Check if user can access a resource (any permission)
    /// </summary>
    Task<bool> CanAccessResourceAsync(int userId, string resourceType, int resourceId);
    
    /// <summary>
    /// Get detailed access check result with reasons
    /// </summary>
    Task<AccessCheckResultDto> CheckAccessAsync(int userId, string resourceType, int resourceId, string? permission = null);
    
    /// <summary>
    /// Get all resources of a type that user has access to
    /// </summary>
    Task<IEnumerable<int>> GetAccessibleResourceIdsAsync(int userId, string resourceType, string? permission = null);
}
```

### 3.3 Authorization Service Implementation Example

```csharp
// Scholarly.WebAPI/Services/AuthorizationService.cs
public class AuthorizationService : IAuthorizationService
{
    private readonly SWBDBContext _context;
    private readonly ILogger<AuthorizationService> _logger;
    
    public AuthorizationService(SWBDBContext context, ILogger<AuthorizationService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task<bool> HasPermissionAsync(int userId, string resourceType, int resourceId, string permission)
    {
        try
        {
            // 1. Check if user is owner (owners have all permissions)
            if (await IsResourceOwnerAsync(userId, resourceType, resourceId))
                return true;
            
            // 2. Check resource-specific ACL
            var hasResourceAccess = await _context.tbl_resource_acl
                .Where(acl => acl.resource_type == resourceType && 
                             acl.resource_id == resourceId &&
                             acl.user_id == userId &&
                             (acl.expires_at == null || acl.expires_at > DateTime.UtcNow))
                .Join(_context.tbl_role_permissions,
                      acl => acl.role_id,
                      rp => rp.role_id,
                      (acl, rp) => rp.permission_id)
                .Join(_context.tbl_permissions,
                      permId => permId,
                      perm => perm.permission_id,
                      (permId, perm) => perm.permission_name)
                .AnyAsync(permName => permName == permission);
            
            if (hasResourceAccess)
                return true;
            
            // 3. Check global role permissions
            var hasGlobalPermission = await _context.tbl_user_roles
                .Where(ur => ur.user_id == userId &&
                            (ur.expires_at == null || ur.expires_at > DateTime.UtcNow))
                .Join(_context.tbl_role_permissions,
                      ur => ur.role_id,
                      rp => rp.role_id,
                      (ur, rp) => rp.permission_id)
                .Join(_context.tbl_permissions,
                      permId => permId,
                      perm => perm.permission_id,
                      (permId, perm) => perm)
                .AnyAsync(perm => perm.permission_name == permission && 
                                  perm.resource_type == resourceType);
            
            return hasGlobalPermission;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking permission {Permission} for user {UserId} on {ResourceType}:{ResourceId}",
                permission, userId, resourceType, resourceId);
            return false;
        }
    }
    
    public async Task<bool> IsResourceOwnerAsync(int userId, string resourceType, int resourceId)
    {
        return resourceType switch
        {
            "PDF" => await _context.tbl_pdf_uploads
                .AnyAsync(p => p.pdf_uploaded_id == resourceId && p.user_id == userId),
            
            "Project" => await _context.tbl_projects
                .AnyAsync(p => p.project_id == resourceId && p.created_by == userId),
            
            "Annotation" => await _context.tbl_pdf_question_tags
                .AnyAsync(a => a.question_id == resourceId && a.user_id == userId),
            
            "Comment" => await _context.tbl_comments
                .AnyAsync(c => c.comments_id == resourceId && c.user_id == userId),
            
            _ => false
        };
    }
    
    public async Task<IEnumerable<string>> GetUserRolesAsync(int userId)
    {
        return await _context.tbl_user_roles
            .Where(ur => ur.user_id == userId &&
                        (ur.expires_at == null || ur.expires_at > DateTime.UtcNow))
            .Select(ur => ur.Role.role_name)
            .ToListAsync();
    }
    
    public async Task<bool> CanAccessResourceAsync(int userId, string resourceType, int resourceId)
    {
        // Check if user has ANY access to the resource
        if (await IsResourceOwnerAsync(userId, resourceType, resourceId))
            return true;
        
        // Check ACL entries
        var hasAclAccess = await _context.tbl_resource_acl
            .AnyAsync(acl => acl.resource_type == resourceType &&
                            acl.resource_id == resourceId &&
                            acl.user_id == userId &&
                            (acl.expires_at == null || acl.expires_at > DateTime.UtcNow));
        
        if (hasAclAccess)
            return true;
        
        // Check if resource is public
        return resourceType switch
        {
            "PDF" => await _context.tbl_pdf_uploads
                .AnyAsync(p => p.pdf_uploaded_id == resourceId && p.is_public == true),
            _ => false
        };
    }
    
    public async Task<IEnumerable<int>> GetAccessibleResourceIdsAsync(int userId, string resourceType, string? permission = null)
    {
        // Get resources user owns
        var ownedIds = resourceType switch
        {
            "PDF" => await _context.tbl_pdf_uploads
                .Where(p => p.user_id == userId)
                .Select(p => p.pdf_uploaded_id)
                .ToListAsync(),
            
            "Project" => await _context.tbl_projects
                .Where(p => p.created_by == userId)
                .Select(p => p.project_id)
                .ToListAsync(),
            
            _ => new List<int>()
        };
        
        // Get resources with ACL access
        var aclIds = await _context.tbl_resource_acl
            .Where(acl => acl.resource_type == resourceType &&
                         acl.user_id == userId &&
                         (acl.expires_at == null || acl.expires_at > DateTime.UtcNow))
            .Select(acl => acl.resource_id)
            .ToListAsync();
        
        return ownedIds.Union(aclIds).Distinct();
    }
    
    // Implement remaining methods...
}
```

### 3.4 ACL Service Interface

```csharp
// Scholarly.WebAPI/Services/IAclService.cs
public interface IAclService
{
    Task<int> GrantAccessAsync(ResourceAccessDto accessDto, int grantedBy);
    Task RevokeAccessAsync(int aclId, int revokedBy);
    Task<IEnumerable<ResourceAccessDto>> GetResourcePermissionsAsync(string resourceType, int resourceId);
    Task<IEnumerable<ResourceAccessDto>> GetUserAccessListAsync(int userId);
    Task TransferOwnershipAsync(string resourceType, int resourceId, int newOwnerId, int transferredBy);
    Task<string> GenerateShareLinkAsync(int pdfId, int userId, DateTime? expiresAt = null);
}
```

### 3.5 Custom Authorization Handlers

```csharp
// Scholarly.WebAPI/Authorization/ResourceOperationRequirement.cs
public class ResourceOperationRequirement : IAuthorizationRequirement
{
    public string Operation { get; }
    public string ResourceType { get; }
    
    public ResourceOperationRequirement(string operation, string resourceType)
    {
        Operation = operation;
        ResourceType = resourceType;
    }
}

// Scholarly.WebAPI/Authorization/ResourceIdentifier.cs
public class ResourceIdentifier
{
    public string ResourceType { get; set; }
    public int ResourceId { get; set; }
}

// Scholarly.WebAPI/Authorization/ResourceAuthorizationHandler.cs
public class ResourceAuthorizationHandler : 
    AuthorizationHandler<ResourceOperationRequirement, ResourceIdentifier>
{
    private readonly IAuthorizationService _authzService;
    
    public ResourceAuthorizationHandler(IAuthorizationService authzService)
    {
        _authzService = authzService;
    }
    
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ResourceOperationRequirement requirement,
        ResourceIdentifier resource)
    {
        var userIdClaim = context.User.FindFirst("UserId");
        if (userIdClaim == null)
        {
            context.Fail();
            return;
        }
        
        var userId = int.Parse(userIdClaim.Value);
        var permission = $"{requirement.ResourceType.ToLower()}.{requirement.Operation.ToLower()}";
        
        var hasPermission = await _authzService.HasPermissionAsync(
            userId, 
            requirement.ResourceType, 
            resource.ResourceId, 
            permission);
        
        if (hasPermission)
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }
}
```

### 3.6 Update Program.cs

```csharp
// Add to Program.cs

// Register authorization services
builder.Services.AddScoped<IAuthorizationService, AuthorizationService>();
builder.Services.AddScoped<IAclService, AclService>();

// Register authorization handlers
builder.Services.AddSingleton<IAuthorizationHandler, ResourceAuthorizationHandler>();

// Configure authorization policies
builder.Services.AddAuthorization(options =>
{
    // PDF policies
    options.AddPolicy("CanReadPdf", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Read", "PDF")));
    options.AddPolicy("CanEditPdf", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Edit", "PDF")));
    options.AddPolicy("CanDeletePdf", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Delete", "PDF")));
    options.AddPolicy("CanSharePdf", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Share", "PDF")));
    
    // Project policies
    options.AddPolicy("CanReadProject", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Read", "Project")));
    options.AddPolicy("CanEditProject", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Edit", "Project")));
    options.AddPolicy("CanDeleteProject", policy =>
        policy.Requirements.Add(new ResourceOperationRequirement("Delete", "Project")));
    
    // Role-based policies
    options.AddPolicy("RequireAdminRole", policy => policy.RequireRole("SystemAdmin"));
    options.AddPolicy("RequireCollaboratorRole", policy => 
        policy.RequireRole("Collaborator", "ProjectOwner", "SystemAdmin"));
});
```

---

## Phase 4: Controller Updates (4-6 days)

### 4.1 Update JWT Token Generation

```csharp
// Update IJWTAuthenticationManager.cs
public async Task<AuthResponse> AuthenticateAsync(tbl_users tblUser, SWBDBContext swbDBContext)
{
    // ... existing code ...
    
    // Add roles to claims
    var roles = await swbDBContext.tbl_user_roles
        .Where(ur => ur.user_id == tblUser.userid &&
                    (ur.expires_at == null || ur.expires_at > DateTime.UtcNow))
        .Join(swbDBContext.tbl_roles,
              ur => ur.role_id,
              r => r.role_id,
              (ur, r) => r.role_name)
        .ToListAsync();
    
    foreach (var role in roles)
    {
        claims.Add(new Claim(ClaimTypes.Role, role));
    }
    
    // ... rest of token generation
}
```

### 4.2 Create ACL Management Controllers

```csharp
// Scholarly.WebAPI/Controllers/RoleController.cs
[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = "RequireAdminRole")]
public class RoleController : ControllerBase
{
    private readonly SWBDBContext _context;
    private readonly ILogger<RoleController> _logger;
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
    {
        // Implementation
    }
    
    [HttpPost]
    public async Task<ActionResult<RoleDto>> CreateRole([FromBody] CreateRoleDto dto)
    {
        // Implementation
    }
}

// Scholarly.WebAPI/Controllers/AclController.cs
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AclController : ControllerBase
{
    private readonly IAclService _aclService;
    private readonly IAuthorizationService _authzService;
    private readonly CurrentContext _currentContext;
    
    [HttpPost("grant")]
    public async Task<ActionResult> GrantAccess([FromBody] ResourceAccessDto accessDto)
    {
        // Verify caller has permission to grant access
        if (!await _authzService.HasPermissionAsync(
            _currentContext.UserId, 
            accessDto.ResourceType, 
            accessDto.ResourceId, 
            "share"))
        {
            return Forbid();
        }
        
        var aclId = await _aclService.GrantAccessAsync(accessDto, _currentContext.UserId);
        return Ok(new { AclId = aclId, Message = "Access granted successfully" });
    }
    
    [HttpDelete("{aclId}")]
    public async Task<ActionResult> RevokeAccess(int aclId)
    {
        await _aclService.RevokeAccessAsync(aclId, _currentContext.UserId);
        return Ok(new { Message = "Access revoked successfully" });
    }
}
```

### 4.3 Update Existing Controllers

```csharp
// Example: Update PDFController.cs

[HttpGet("{pdfId}")]
[Authorize]
public async Task<IActionResult> GetPdf(int pdfId)
{
    // Check ACL before allowing access
    if (!await _authorizationService.CanAccessResourceAsync(
        _currentContext.UserId, "PDF", pdfId))
    {
        _logger.LogWarning("User {UserId} denied access to PDF {PdfId}", 
            _currentContext.UserId, pdfId);
        return Forbid("You do not have permission to access this PDF");
    }
    
    // ... rest of logic
}

[HttpDelete("{pdfId}")]
[Authorize]
public async Task<IActionResult> DeletePdf(int pdfId)
{
    // Check delete permission
    if (!await _authorizationService.HasPermissionAsync(
        _currentContext.UserId, "PDF", pdfId, "pdf.delete"))
    {
        return Forbid("You do not have permission to delete this PDF");
    }
    
    // ... rest of logic
}

[HttpPost("{pdfId}/share")]
[Authorize]
public async Task<IActionResult> SharePdf(int pdfId, [FromBody] SharePdfDto dto)
{
    // Check share permission and grant access
    if (!await _authorizationService.HasPermissionAsync(
        _currentContext.UserId, "PDF", pdfId, "pdf.share"))
    {
        return Forbid("You do not have permission to share this PDF");
    }
    
    await _aclService.GrantAccessAsync(new ResourceAccessDto
    {
        ResourceType = "PDF",
        ResourceId = pdfId,
        UserId = dto.TargetUserId,
        RoleName = dto.RoleName
    }, _currentContext.UserId);
    
    return Ok(new { Message = "PDF shared successfully" });
}
```

---

## Phase 5: Data Access Layer (3-4 days)

### Repository Interfaces and Implementations

```csharp
// Scholarly.DataAccess/Repositories/IRoleRepository.cs
public interface IRoleRepository : IRepository<tbl_roles>
{
    Task<tbl_roles?> GetByNameAsync(string roleName);
    Task<IEnumerable<tbl_roles>> GetRolesWithPermissionsAsync();
    Task<IEnumerable<string>> GetUserRolesAsync(int userId);
}

// Scholarly.DataAccess/Repositories/IAclRepository.cs
public interface IAclRepository : IRepository<tbl_resource_acl>
{
    Task<IEnumerable<tbl_resource_acl>> GetResourceAclAsync(string resourceType, int resourceId);
    Task<IEnumerable<tbl_resource_acl>> GetUserAclAsync(int userId);
    Task<bool> HasAccessAsync(int userId, string resourceType, int resourceId);
}
```

---

## Phase 6: Migration & Data Seeding (2-3 days)

### Database Migration Script

```sql
-- File: db/ACL_MIGRATION.sql

BEGIN;

-- Step 1: Create all new tables
-- (Use CREATE TABLE scripts from Phase 1)

-- Step 2: Seed default roles
INSERT INTO tbl_roles (role_name, description, is_system_role) VALUES
    ('SystemAdmin', 'Full system access with all permissions', true),
    ('ProjectOwner', 'Owner of a project with full control', true),
    ('Collaborator', 'Can edit and contribute to shared resources', true),
    ('Viewer', 'Read-only access to shared resources', true);

-- Step 3: Seed permissions
INSERT INTO tbl_permissions (permission_name, resource_type, action, description) VALUES
    ('pdf.read', 'PDF', 'read', 'View PDF content'),
    ('pdf.edit', 'PDF', 'edit', 'Edit PDF metadata and annotations'),
    ('pdf.delete', 'PDF', 'delete', 'Delete PDF'),
    ('pdf.share', 'PDF', 'share', 'Share PDF with others'),
    ('project.read', 'Project', 'read', 'View project details'),
    ('project.edit', 'Project', 'edit', 'Edit project details'),
    ('project.delete', 'Project', 'delete', 'Delete project');

-- Step 4: Assign permissions to roles
INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM tbl_roles r
CROSS JOIN tbl_permissions p
WHERE r.role_name = 'SystemAdmin';

-- Step 5: Migrate existing users
UPDATE tbl_users
SET default_role_id = (SELECT role_id FROM tbl_roles WHERE role_name = 'Collaborator');

INSERT INTO tbl_user_roles (user_id, role_id, assigned_date)
SELECT u.userid, r.role_id, CURRENT_TIMESTAMP
FROM tbl_users u
CROSS JOIN tbl_roles r
WHERE r.role_name = 'Collaborator';

-- Step 6: Create ACL entries for existing PDFs
INSERT INTO tbl_resource_acl (resource_type, resource_id, user_id, role_id, granted_by, granted_date)
SELECT 
    'PDF',
    p.pdf_uploaded_id,
    p.user_id,
    (SELECT role_id FROM tbl_roles WHERE role_name = 'ProjectOwner'),
    p.user_id,
    COALESCE(p.created_date, CURRENT_TIMESTAMP)
FROM tbl_pdf_uploads p
WHERE p.user_id IS NOT NULL;

COMMIT;
```

---

## Phase 7: Testing & Documentation (3-5 days)

### Unit Tests

```csharp
// Scholarly.Tests/Services/AuthorizationServiceTests.cs
public class AuthorizationServiceTests
{
    [Fact]
    public async Task HasPermission_OwnerAccess_ReturnsTrue()
    {
        // Test that resource owners have full permissions
    }
    
    [Fact]
    public async Task HasPermission_AclGranted_ReturnsTrue()
    {
        // Test ACL-based access
    }
    
    [Fact]
    public async Task HasPermission_NoAccess_ReturnsFalse()
    {
        // Test unauthorized access
    }
}
```

### Documentation To Create

1. **ACL User Guide** - How users share and manage access
2. **ACL Administrator Guide** - Managing roles and permissions
3. **ACL Developer Guide** - Implementing ACL in new features
4. **API Documentation** - Update Swagger/OpenAPI specs

---

## Resources Requiring ACL

### Priority 1 (Must Have)
1. **PDFs** (`tbl_pdf_uploads`) - Core resource for sharing
2. **Projects** (`tbl_projects`) - Team collaboration

### Priority 2 (Should Have)
3. **Annotations** (`tbl_pdf_question_tags`) - Research notes
4. **Comments** (`tbl_comments`) - Discussion threads

### Priority 3 (Nice to Have)
5. **Groups** (`tbl_groups`) - Team permissions
6. **PDF Summaries** (`tbl_pdf_summary_list`) - AI content

---

## Alternative: Simplified RBAC (1-2 weeks)

If full ACL is too complex, consider:

### Changes:
- Add `role` column to `tbl_users`
- Create `tbl_project_members` only
- Use policy-based authorization
- Simple owner checks

### Pros:
- ✅ 60% less work
- ✅ Simpler maintenance
- ✅ Adequate for most cases

### Cons:
- ❌ Less flexible
- ❌ No fine-grained control

---

## Recommended Approach: Phased Implementation

### Sprint 1 (Week 1-2): Foundation
- Database schema
- Basic RBAC with user roles
- Update JWT

### Sprint 2 (Week 2-3): Project-Level ACL
- Project members
- Project-based access
- Basic ACL infrastructure

### Sprint 3 (Week 3-4): Resource-Level ACL
- PDF sharing
- Fine-grained permissions
- Public/private visibility

### Sprint 4 (Week 4-5): Polish
- Annotation permissions
- Audit logging
- Admin UI
- Documentation

---

## Effort Summary

| Phase | Description | Time | Complexity |
|-------|-------------|------|------------|
| Phase 1 | Database Schema | 3-5 days | Medium |
| Phase 2 | Entity Models | 2-3 days | Low |
| Phase 3 | Authorization Infrastructure | 5-7 days | High |
| Phase 4 | Controller Updates | 4-6 days | Medium |
| Phase 5 | Data Access Layer | 3-4 days | Medium |
| Phase 6 | Migration & Seeding | 2-3 days | Medium |
| Phase 7 | Testing & Documentation | 3-5 days | Medium |
| **Total** | **Full ACL** | **3-5 weeks** | **Medium-High** |

**Simplified RBAC:** 1-2 weeks, Low-Medium complexity

---

## Conclusion

A full ACL implementation provides:
- ✅ Flexible resource sharing
- ✅ Fine-grained permissions
- ✅ Project collaboration
- ✅ Audit trail
- ✅ Scalable architecture

The phased approach allows incremental delivery while building a robust authorization system.

---

## Next Steps

1. Review with stakeholders
2. Choose approach (Full vs Simplified)
3. Prioritize resources to protect
4. Set up development environment
5. Create migration plan
6. Begin Sprint 1

---

**Document Version:** 1.0  
**Created:** November 21, 2025  
**Last Updated:** November 21, 2025

