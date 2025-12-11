using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.DataAccess
{
    /// <summary>
    /// Data access layer for Project operations
    /// </summary>
    public interface IProjectDa
    {
        bool AddProject(SWBDBContext swbDBContext, Logger logger, int userId, string title, string description);
        List<Projects> LoadProjects(SWBDBContext swbDBContext, Logger logger, int userId);
        Projects? GetProject(SWBDBContext swbDBContext, Logger logger, int projectId);
        bool UpdateProject(SWBDBContext swbDBContext, Logger logger, Projects project, int userId);
        bool DeleteProject(SWBDBContext swbDBContext, Logger logger, int projectId, int userId);
    }

    public class ProjectDa : IProjectDa
    {
        /// <summary>
        /// Add a new project
        /// </summary>
        public bool AddProject(SWBDBContext swbDBContext, Logger logger, int userId, string title, string description)
        {
            bool success = true;
            try
            {
                // Check if project already exists
                bool projectExists = swbDBContext.tbl_projects
                    .Any(x => x.status == true && x.title == title && x.created_by == userId);

                if (projectExists)
                {
                    logger.Warn($"Project '{title}' already exists for user {userId}");
                    throw new InvalidOperationException($"Project with title '{title}' already exists");
                }

                var newProject = new tbl_projects()
                {
                    title = title,
                    description = description,
                    created_by = userId,
                    created_date = DateTime.UtcNow,
                    status = true
                };
                swbDBContext.tbl_projects.Add(newProject);
                swbDBContext.SaveChanges();

                logger.Info($"Project '{title}' created successfully with ID {newProject.project_id} by user {userId}");
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error adding project '{title}' for user {userId}");
                success = false;
            }

            return success;
        }

        /// <summary>
        /// Load all projects for a user
        /// </summary>
        public List<Projects> LoadProjects(SWBDBContext swbDBContext, Logger logger, int userId)
        {
            List<Projects> projects = new List<Projects>();
            try
            {
                projects = swbDBContext.tbl_projects
                    .Where(x => x.status && x.created_by == userId)
                    .Select(x => new Projects
                    {
                        ProjectId = x.project_id,
                        Title = x.title,
                        Description = x.description,
                        CreatedOn = x.created_date,
                        ModifiedOn = x.updated_date,
                        project_id = x.project_id,
                    })
                    .OrderByDescending(x => x.CreatedOn)
                    .ToList();

                logger.Info($"Loaded {projects.Count} projects for user {userId}");
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error loading projects for user {userId}");
            }
            return projects;
        }

        /// <summary>
        /// Get a specific project by ID
        /// </summary>
        public Projects? GetProject(SWBDBContext swbDBContext, Logger logger, int projectId)
        {
            try
            {
                var project = swbDBContext.tbl_projects
                    .Where(x => x.project_id == projectId && x.status)
                    .Select(x => new Projects
                    {
                        ProjectId = x.project_id,
                        Title = x.title,
                        Description = x.description,
                        CreatedOn = x.created_date,
                        ModifiedOn = x.updated_date
                    })
                    .FirstOrDefault();

                if (project == null)
                {
                    logger.Warn($"Project {projectId} not found");
                }

                return project;
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error getting project {projectId}");
                return null;
            }
        }

        /// <summary>
        /// Update an existing project
        /// </summary>
        public bool UpdateProject(SWBDBContext swbDBContext, Logger logger, Projects project, int userId)
        {
            bool success = false;
            try
            {
                var existingProject = swbDBContext.tbl_projects
                    .FirstOrDefault(x => x.project_id == project.ProjectId);

                if (existingProject != null)
                {
                    existingProject.title = project.Title;
                    existingProject.description = project.Description;
                    existingProject.updated_by = userId;
                    existingProject.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                    success = true;

                    logger.Info($"Project {project.ProjectId} updated by user {userId}");
                }
                else
                {
                    logger.Warn($"Project {project.ProjectId} not found for update");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error updating project {project.ProjectId}");
            }
            return success;
        }

        /// <summary>
        /// Delete a project and all associated PDFs and summaries (soft delete with transaction)
        /// </summary>
        public bool DeleteProject(SWBDBContext swbDBContext, Logger logger, int projectId, int userId)
        {
            using var transaction = swbDBContext.Database.BeginTransaction();
            bool success = false;
            try
            {
                var project = swbDBContext.tbl_projects
                    .FirstOrDefault(x => x.project_id == projectId);

                if (project != null)
                {
                    // Soft delete all PDFs in the project
                    var pdfUploads = swbDBContext.tbl_pdf_uploads
                        .Where(x => x.status == true && x.project_id == projectId)
                        .ToList();

                    if (pdfUploads.Any())
                    {
                        foreach (var upload in pdfUploads)
                        {
                            // Soft delete associated summaries
                            var summaries = swbDBContext.tbl_pdf_summary_list
                                .Where(x => x.status && x.pdf_uploaded_id == upload.pdf_uploaded_id)
                                .ToList();

                            foreach (var summary in summaries)
                            {
                                summary.status = false;
                                summary.modified_by = userId;
                                summary.modified_date = DateTime.UtcNow;
                            }

                            upload.status = false;
                        }
                    }

                    // Soft delete the project
                    project.status = false;
                    project.updated_by = userId;
                    project.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                    transaction.Commit();
                    success = true;

                    logger.Info($"Project {projectId} and {pdfUploads.Count} associated PDFs deleted by user {userId}");
                }
                else
                {
                    logger.Warn($"Project {projectId} not found for deletion");
                }
            }
            catch (Exception exception)
            {
                transaction.Rollback();
                logger.Error(exception, $"Error deleting project {projectId}");
            }
            return success;
        }
    }
}

