using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.DataAccess
{
    /// <summary>
    /// Data access layer for Group operations
    /// </summary>
    public interface IGroupDa
    {
        bool AddGroup(SWBDBContext swbDBContext, Logger logger, int userId, string groupName, string tagsText);
        List<Groups> LoadGroups(SWBDBContext swbDBContext, Logger logger, int userId);
        bool AddNewEmail(SWBDBContext swbDBContext, Logger logger, int userId, string newEmail, int groupId);
        bool DeleteEmail(SWBDBContext swbDBContext, Logger logger, int userId, int groupEmailId);
        bool DeleteGroup(SWBDBContext swbDBContext, Logger logger, int userId, int groupId);
    }

    public class GroupDa : IGroupDa
    {
        /// <summary>
        /// Add a new group with email tags
        /// </summary>
        public bool AddGroup(SWBDBContext swbDBContext, Logger logger, int userId, string groupName, string tagsText)
        {
            bool success = false;
            try
            {
                // Check if group already exists
                bool groupExists = swbDBContext.tbl_groups
                    .Any(x => x.status == true && x.group_name == groupName && x.created_by == userId);
                
                if (groupExists)
                {
                    logger.Warn($"Group '{groupName}' already exists for user {userId}");
                    return false;
                }

                // Create new group
                var newGroup = new tbl_groups()
                {
                    user_id = userId,
                    group_name = groupName,
                    created_by = userId,
                    created_date = DateTime.UtcNow,
                    updated_date = DateTime.UtcNow,
                    status = false
                };
                swbDBContext.tbl_groups.Add(newGroup);
                swbDBContext.SaveChanges();

                // Add emails from tags
                if (!string.IsNullOrWhiteSpace(tagsText))
                {
                    string[] emails = tagsText.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                    int groupId = newGroup.group_id;

                    foreach (string email in emails)
                    {
                        var groupEmail = new tbl_groups_emails()
                        {
                            user_id = userId,
                            email = email.Trim(),
                            created_by = userId,
                            created_date = DateTime.UtcNow,
                            updated_date = DateTime.UtcNow,
                            group_id = groupId,
                            status = false
                        };
                        swbDBContext.tbl_groups_emails.Add(groupEmail);
                    }
                    swbDBContext.SaveChanges();
                }

                success = true;
                logger.Info($"Group '{groupName}' created successfully with ID {newGroup.group_id}");
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error adding group '{groupName}' for user {userId}");
            }

            return success;
        }

        /// <summary>
        /// Load all groups for a user
        /// </summary>
        public List<Groups> LoadGroups(SWBDBContext swbDBContext, Logger logger, int userId)
        {
            List<Groups> groups = new List<Groups>();
            try
            {
                groups = swbDBContext.tbl_groups
                    .Where(q => q.status != true && q.user_id == userId)
                    .Select(q => new Groups()
                    {
                        GroupId = q.group_id,
                        GroupName = q.group_name,
                        Members = swbDBContext.tbl_groups_emails
                            .Count(x => x.group_id == q.group_id && x.status != true),
                        Groupmails = swbDBContext.tbl_groups_emails
                            .Where(x => x.group_id == q.group_id && x.status != true)
                            .Select(a => new GroupEmails()
                            {
                                Email = a.email,
                                GroupEmailId = a.group_email_id
                            })
                            .ToList()
                    })
                    .Where(x => !string.IsNullOrEmpty(x.GroupName))
                    .ToList();

                logger.Info($"Loaded {groups.Count} groups for user {userId}");
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error loading groups for user {userId}");
            }
            return groups;
        }

        /// <summary>
        /// Add a new email to an existing group
        /// </summary>
        public bool AddNewEmail(SWBDBContext swbDBContext, Logger logger, int userId, string newEmail, int groupId)
        {
            bool success = false;
            try
            {
                // Check if email already exists in this group
                bool emailExists = swbDBContext.tbl_groups_emails
                    .Any(x => x.group_id == groupId && x.email == newEmail && x.status != true);

                if (emailExists)
                {
                    logger.Warn($"Email '{newEmail}' already exists in group {groupId}");
                    return false;
                }

                var groupEmail = new tbl_groups_emails()
                {
                    user_id = userId,
                    email = newEmail,
                    created_by = userId,
                    created_date = DateTime.UtcNow,
                    updated_date = DateTime.UtcNow,
                    group_id = groupId,
                    status = false
                };
                swbDBContext.tbl_groups_emails.Add(groupEmail);
                swbDBContext.SaveChanges();
                success = true;

                logger.Info($"Email '{newEmail}' added to group {groupId} by user {userId}");
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error adding email '{newEmail}' to group {groupId}");
            }

            return success;
        }

        /// <summary>
        /// Delete an email from a group (soft delete)
        /// </summary>
        public bool DeleteEmail(SWBDBContext swbDBContext, Logger logger, int userId, int groupEmailId)
        {
            bool success = false;
            try
            {
                var groupEmail = swbDBContext.tbl_groups_emails
                    .FirstOrDefault(x => x.group_email_id == groupEmailId);

                if (groupEmail != null)
                {
                    groupEmail.status = true; // Soft delete
                    groupEmail.updated_by = userId;
                    groupEmail.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                    success = true;

                    logger.Info($"Email {groupEmailId} deleted from group by user {userId}");
                }
                else
                {
                    logger.Warn($"Email {groupEmailId} not found");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error deleting email {groupEmailId}");
            }
            return success;
        }

        /// <summary>
        /// Delete a group (soft delete)
        /// </summary>
        public bool DeleteGroup(SWBDBContext swbDBContext, Logger logger, int userId, int groupId)
        {
            bool success = false;
            try
            {
                var group = swbDBContext.tbl_groups.Find(groupId);
                if (group != null)
                {
                    group.status = true; // Soft delete
                    group.updated_by = userId;
                    group.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                    success = true;

                    logger.Info($"Group {groupId} deleted by user {userId}");
                }
                else
                {
                    logger.Warn($"Group {groupId} not found");
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception, $"Error deleting group {groupId}");
            }
            return success;
        }
    }
}

