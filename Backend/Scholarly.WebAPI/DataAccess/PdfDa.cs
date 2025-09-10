using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;
using System;

namespace Scholarly.WebAPI.DataAccess
{
    public interface IPdfDa
    {
        bool DeleteGroupEmail(SWBDBContext swbDBContext, Logger logger, string UserId, int GroupEmailId);
        bool AddGroup(SWBDBContext swbDBContext, Logger logger, string UserId, string GroupName, string TagsText);
        List<Groups> LoadGroups(SWBDBContext swbDBContext, Logger logger, string UserId);
        bool AddNewEmail(SWBDBContext swbDBContext, Logger logger, string UserId, string newEmail, int GroupId);
        PDF GetPDFPath(SWBDBContext swbDBContext, Logger logger, int PathId);
        bool DeleteEmail(SWBDBContext swbDBContext, Logger logger, string UserId, int GroupEmailId);
        bool DeleteGroup(SWBDBContext swbDBContext, Logger logger, string UserId, int GroupId);

        bool DeletePdf(SWBDBContext swbDBContext, Logger logger, int UId);
        bool DeleteQuestion(SWBDBContext swbDBContext, Logger logger, int QID);

        //bool EditPdf(SWBDBContext swbDBContext, Logger logger, int UId);
        bool AddProject(SWBDBContext swbDBContext, Logger logger, int UserId, string Title, string Description);

        List<Projects> LoadProjects(SWBDBContext swbDBContext, Logger logger, int UserId);
    }
    public class PdfDa : IPdfDa
    {
        public bool DeleteQuestion(SWBDBContext swbDBContext, Logger logger, int QID)
        {
            bool flag = false;
            try
            {
                tbl_pdf_question_tags? result = swbDBContext.tbl_pdf_question_tags.FirstOrDefault(x => x.question_id == QID);
                if (result != null)
                {
                    result.is_deleted = true;
                    swbDBContext.SaveChanges();
                    flag = true;
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return flag;
        }
        public bool DeletePdf(SWBDBContext swbDBContext, Logger logger, int UId)
        {
            bool flag = false;
            try
            {
                tbl_pdf_uploads? selectedFile = swbDBContext.tbl_pdf_uploads.Find(UId); 
                if (selectedFile != null)
                {
                    #region CHECK & DELETE PDF SUMMARY, IF EXISTS
                    var pdf_summary = swbDBContext.tbl_pdf_summary_list.Where(x => x.status == true && x.pdf_uploaded_id == UId).ToList();
                    if (pdf_summary.Any())
                    {
                        foreach (var x in pdf_summary)
                        {
                            x.status = false;
                            x.modified_date = DateTime.UtcNow;
                            x.modified_by = UId;
                        }
                    }
                    #endregion

                    selectedFile.status = false;
                    swbDBContext.SaveChanges();
                    flag = true;
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return flag;
        }
        public bool DeleteGroup(SWBDBContext swbDBContext, Logger logger, string UserId, int GroupId)
        {
            bool flag = false;
            try
            {
                tbl_groups? selectedGroup = swbDBContext.tbl_groups.Find(GroupId); 
                if (selectedGroup != null)
                {
                    selectedGroup.status = new bool?(true);
                    selectedGroup.updated_by = UserId;
                    selectedGroup.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                    flag = true;
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return flag;
        }
        public bool DeleteEmail(SWBDBContext swbDBContext, Logger logger, string UserId, int GroupEmailId)
        {
            bool flag = false;
            try
            {
                tbl_groups_emails? nullable = (
                     from x in swbDBContext.tbl_groups_emails
                     where x.group_email_id == GroupEmailId
                     select x).FirstOrDefault();
                if (nullable != null)
                {
                    nullable.status = new bool?(true);
                    nullable.updated_by = UserId;
                    nullable.updated_date = DateTime.UtcNow;
                    swbDBContext.SaveChanges();
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return flag;
        }
        public PDF GetPDFPath(SWBDBContext swbDBContext, Logger logger, int PathId)
        {

            PDF? pDF = new PDF();
            try
            {
                pDF = (
                    from x in swbDBContext.tbl_pdf_uploads
                    where (int?)x.pdf_uploaded_id == PathId
                    select x into q
                    select new PDF()
                    {
                        PDFPath = q.pdf_saved_path,
                        IsAccessed = (q.is_public == (bool?)true ? "Open Access" : "Closed Access")
                    }).FirstOrDefault<PDF>();
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return pDF;
        }
        public bool AddNewEmail(SWBDBContext swbDBContext, Logger logger, string UserId, string newEmail, int GroupId)
        {
            bool flag = false;
            try
            {

                var tBLGroupsEmail = new tbl_groups_emails()
                {
                    user_id = UserId,
                    email = newEmail,
                    created_by = UserId,
                    created_date = DateTime.UtcNow,
                    updated_date = DateTime.UtcNow,
                    group_id = new int?(GroupId)
                };
                swbDBContext.tbl_groups_emails.Add(tBLGroupsEmail);
                swbDBContext.SaveChanges();
                flag = true;
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }

            return flag;
        }
        public List<Groups> LoadGroups(SWBDBContext swbDBContext, Logger logger, string UserId)
        {
            List<Groups> groups = new List<Groups>();
            try
            {
                groups = (
                    from x in (
                        from q in swbDBContext.tbl_groups
                        where q.status != (bool?)true && q.user_id == UserId
                        select new Groups()
                        {
                            GroupId = (int?)q.group_id,
                            GroupName = q.group_name,
                            Members = (int?)swbDBContext.tbl_groups_emails.Where<tbl_groups_emails>((tbl_groups_emails x) => x.group_id == (int?)q.group_id && x.status != (bool?)true).Count<tbl_groups_emails>(),
                            Groupmails = swbDBContext.tbl_groups_emails.Where<tbl_groups_emails>((tbl_groups_emails x) => x.group_id == (int?)q.group_id && x.status != (bool?)true).Select<tbl_groups_emails, GroupEmails>((tbl_groups_emails a) => new GroupEmails()
                            {
                                Email = a.email,
                                GroupEmailId = (int?)a.group_email_id
                            }).ToList<GroupEmails>()
                        }).ToList<Groups>()
                    where x.GroupName != ""
                    select x).ToList<Groups>();
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return groups;
        }
        public bool AddGroup(SWBDBContext swbDBContext, Logger logger, string UserId, string GroupName, string TagsText)
        {
            bool flag = false;
            try
            {
                bool result = swbDBContext.tbl_groups.Any(x => x.status == true && x.group_name == GroupName && x.created_by == UserId);
                if (result)
                {
                    flag = false;
                }
                else
                {
                    string[] strArrays = TagsText.Split(new char[] { ',' });

                    tbl_groups tBLGroup = new tbl_groups()
                    {
                        user_id = UserId,
                        group_name = GroupName,
                        created_by = UserId,
                        created_date = DateTime.UtcNow,
                        updated_date = DateTime.UtcNow,
                    };
                    swbDBContext.tbl_groups.Add(tBLGroup);
                    swbDBContext.SaveChanges();

                    int groupID = tBLGroup.group_id;
                    string[] strArrays1 = strArrays;
                    for (int i = 0; i < (int)strArrays1.Length; i++)
                    {
                        string str = strArrays1[i];
                        var tBLGroupsEmail = new tbl_groups_emails()
                        {
                            user_id = UserId,
                            email = str,
                            created_by = UserId,
                            created_date = DateTime.UtcNow,
                            updated_date = DateTime.UtcNow,
                            group_id = new int?(groupID)
                        };
                        swbDBContext.tbl_groups_emails.Add(tBLGroupsEmail);
                        swbDBContext.SaveChanges();
                        flag = true;
                    }

                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }

            return flag;
        }

        public bool DeleteGroupEmail(SWBDBContext swbDBContext, Logger logger, string UserId, int groupEmailId)
        {
            tbl_groups_emails? retult = swbDBContext.tbl_groups_emails.FirstOrDefault(p => p.group_email_id == groupEmailId);
            if (retult != null)
            {
                retult.status = new bool?(true);
                retult.updated_by = UserId;
                retult.updated_date = DateTime.UtcNow;
                swbDBContext.SaveChanges();
                return true;
            }
            return false;
        }

        public bool AddProject(SWBDBContext swbDBContext, Logger logger, int UserId, string Title, string Description)
        {
            bool flag = false;
            try
            {
                bool result = swbDBContext.tbl_projects.Any(x => x.status == true && x.title == Title && x.created_by == UserId);
                if (result)
                {
                    flag = false;
                    throw new Exception("Already exist");
                }
                else
                {
                    tbl_projects tblProject = new tbl_projects()
                    {
                        created_by = UserId,
                        created_date = DateTime.UtcNow,
                        status =true
                    };
                    swbDBContext.tbl_projects.Add(tblProject);
                    swbDBContext.SaveChanges();
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }

            return flag;
        }
        public List<Projects> LoadProjects(SWBDBContext swbDBContext, Logger logger, int UserId)
        {
            List<Projects> projects = new List<Projects>();
            try
            {
                projects = swbDBContext.tbl_projects.Where(x => x.status && x.created_by == UserId)
                          .Select(x => new Projects {
                              ProjectId = x.project_id,
                              Title = x.title,
                              Description = x.description,
                          }).ToList();
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
            return projects;
        }
    }
}
