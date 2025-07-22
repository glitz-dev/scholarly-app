using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.DataAccess
{
    public interface IUserDa
    {
        Task<tbl_users> Registration(SWBDBContext swbDBContext, User user);
        Task<string> ConfirmEmail(SWBDBContext swbDBContext, string token, string email);
        Task<bool> SaveUserDetails(SWBDBContext swbDBContext, string UserId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname);
        Task<PDF?> GetCounts(SWBDBContext swbDBContext);
        Task<List<UserLogin>?> GetSpecializations(SWBDBContext swbDBContext);
        Task<UserLogin?> GetUserDetails(SWBDBContext swbDBContext, string UserId);
    }
    public class UserDa : IUserDa
    {
        public async Task<tbl_users> Registration(SWBDBContext swbDBContext, User user)
        {
            var tblUser = new tbl_users()
            {
                firstname = user.FirstName,
                lastname = user.LastName,
                password = user.Password,
                activationcode = Guid.NewGuid(),
                emailid = user.EmailID,
                isemailverified = 0,
                current_location = user.CurrentLocation,
                current_position = user.CurrentPosition,
                university = user.University,
                //gender=user.Gender
            };
            swbDBContext.tbl_users.Add(tblUser);
            await swbDBContext.SaveChangesAsync();
            return tblUser;
        }

        public async Task<string> ConfirmEmail(SWBDBContext swbDBContext, string token, string email)
        {
            var user = await swbDBContext.tbl_users.FirstOrDefaultAsync(p => p.emailid == email);
            if (user == null)
                return "Error";
            else
            {
                user.isemailverified = 0;
                await swbDBContext.SaveChangesAsync();
                return "Email Verified";
            }
        }
        public async Task<bool> SaveUserDetails(SWBDBContext swbDBContext, string UserId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname)
        {
            tbl_users? university = (
                        from s in swbDBContext.tbl_users
                        where s.userid.ToString() == UserId
                        select s into p
                        select p).FirstOrDefault<tbl_users>();
            if (university != null)
            {
                university.university = University;
                university.current_position = CurrentPosition;
                university.current_location = CurrentLocation;
                university.specialization_id = SpecilizationId;
                university.firstname = firstname;
                university.lastname = Lastname;
                await swbDBContext.SaveChangesAsync();
               return true;
            }

            return false;
        }

        public async Task<PDF?> GetCounts(SWBDBContext swbDBContext)
        {
            PDF? pDF =await (
                              from x in swbDBContext.tbl_pdf_uploads
                              where x.status != (bool?)true
                              select x into p
                              select new PDF()
                              {
                                  UserCount = swbDBContext.tbl_users.Where<tbl_users>((tbl_users x) => x.emailid != null).Select<tbl_users, int>((tbl_users x) => x.userid).Count<int>(),
                                  AnnotationCount = swbDBContext.tbl_pdf_question_tags.Where<tbl_pdf_question_tags>((tbl_pdf_question_tags x) => x.isdeleted != (bool?)true).Count<tbl_pdf_question_tags>(),
                                  ArticleCount = swbDBContext.tbl_pdf_uploads.Where<tbl_pdf_uploads>((tbl_pdf_uploads x) => x.status != (bool?)true).Count<tbl_pdf_uploads>(),
                                  GroupsCount = swbDBContext.tbl_groups.Where<tbl_groups>((tbl_groups c) => c.group_name != null && c.group_name != "" && c.status != (bool?)true).Count<tbl_groups>()
                              }).FirstOrDefaultAsync<PDF>();
            return pDF;
        }

        public async Task<List<UserLogin>?> GetSpecializations(SWBDBContext swbDBContext)
        {
            List<UserLogin> userLogins = (
                    from q in swbDBContext.tbl_user_specialization
                    select new UserLogin()
                    {
                        SpecialzationId = q.specialization_id,
                        Specialzation = q.specialization
                    }).ToList();

            return userLogins;
        }

        public async Task<UserLogin?> GetUserDetails(SWBDBContext swbDBContext, string UserId)
        {
            UserLogin? userLogin = await (
                    from x in swbDBContext.tbl_users
                    where x.userid.ToString() == UserId
                    select x into q
                    select new UserLogin()
                    {
                        University = q.university,
                        FirstName = q.firstname,
                        LastName = q.lastname,
                        SpecialzationId = q.specialization_id,
                        CurrentPosition = q.current_position,
                        CurrentLocation = q.current_location,
                        EmailID = q.emailid,
                        Specialzation = ""
                    }).FirstOrDefaultAsync();

            if (userLogin != null && userLogin.SpecialzationId > 0)
            {
                var result =await swbDBContext.tbl_user_specialization.FirstOrDefaultAsync(p => p.specialization_id == userLogin.SpecialzationId);
                if(result != null)
                {
                    userLogin.Specialzation = result.specialization;
                }

            }
            return userLogin;
        }
    }
}