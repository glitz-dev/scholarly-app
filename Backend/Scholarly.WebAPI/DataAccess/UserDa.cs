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
        Task<bool> SaveUserDetails(SWBDBContext swbDBContext, int userId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname);
        Task<TotalCounts?> GetCounts(SWBDBContext swbDBContext);
        Task<List<UserLogin>?> GetSpecializations(SWBDBContext swbDBContext);
        Task<UserLogin?> GetUserDetails(SWBDBContext swbDBContext, int userId);
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
        public async Task<bool> SaveUserDetails(SWBDBContext swbDBContext, int userId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname)
        {
            tbl_users? university = (
                        from s in swbDBContext.tbl_users
                        where s.userid == userId
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

        public async Task<TotalCounts?> GetCounts(SWBDBContext swbDBContext)
        {
            int userCounts = swbDBContext.tbl_users.Where(x => x.emailid != null).Count();
            int annotationCount = swbDBContext.tbl_pdf_question_tags.Where(x => !(bool)x.is_deleted).Count();
            int articleCount = swbDBContext.tbl_pdf_uploads.Count(x => (bool)x.status);
            int groupsCount = swbDBContext.tbl_groups.Count(x => !string.IsNullOrWhiteSpace(x.group_name) && (bool)x.status);
             
            TotalCounts totalCounts = new TotalCounts() { 
                UserCount = userCounts,
                AnnotationCount = annotationCount,
                ArticleCount = articleCount,
                GroupsCount=groupsCount
            };
            return totalCounts;
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

        public async Task<UserLogin?> GetUserDetails(SWBDBContext swbDBContext, int userId)
        {
            UserLogin? userLogin = await (
                    from x in swbDBContext.tbl_users
                    where x.userid == userId
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