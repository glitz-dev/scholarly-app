using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Helper;
using Scholarly.WebAPI.Model;
using StackExchange.Redis;
using System.Net.Mail;
using System.Net;
using NLog;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Reflection;
using System;
using Microsoft.AspNetCore.Identity;
using Scholarly.WebAPI.DataAccess;

namespace Scholarly.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private static Logger _logger = LogManager.GetCurrentClassLogger();
        private readonly IUserDa _IUserDa;
        public UserController(IConfiguration configuration, SWBDBContext swbDBContext, IUserDa iIUserDa)
        {
            _config = configuration;
            _swbDBContext = swbDBContext;
            _IUserDa = iIUserDa;
        }
        [HttpGet]
        [Route("hello")]
        public string Hello()
        {
            return "Hello User";
        }

        [HttpPost]
        //[ValidateAntiForgeryToken]
        public async Task<ActionResult> Registration(User user)
        {
            bool flag = false;
            string str = "";
            if (!ModelState.IsValid)
            {
                return Ok("Invalid Request");
            }
            else
            {
                if (_swbDBContext.tbl_users.Any(p => p.emailid == user.EmailID))
                {
                    return Conflict(new { Warning = "Email already exist" });
                }
                user.Password = PasswordHasher.HashPassword(user.Password);
                tbl_users tblUser = await _IUserDa.Registration(_swbDBContext, user);
                Common.SendEmail(_logger,user.EmailID, tblUser.activationcode.ToString());
            }
            return Ok(new { Message = "New User: " + user.FirstName + " Created" });
        }
       
        [HttpGet]
        public async Task<IActionResult> ConfirmEmail(string token, string email)
        {
            return Ok(_IUserDa.ConfirmEmail(_swbDBContext, token, token));
        }

        [HttpPost]
        [Route("saveuserdetails")]
        public async Task<ActionResult> SaveUserDetails(string UserId, int? SpecilizationId, string University, string CurrentPosition, string CurrentLocation, string firstname, string Lastname)
        {
            bool flag = false;
            try
            {

                flag = await _IUserDa.SaveUserDetails(_swbDBContext, UserId, SpecilizationId, University, CurrentPosition, CurrentLocation, firstname, Lastname);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(flag);
        }

        [HttpPost]
        [Route("sendforgotpasswordemail")]
        public ActionResult SendForgotPasswordEmail(string Email)
        {
            string str = "";
            try
            {
                if ((
                    from x in _swbDBContext.tbl_users
                    where x.emailid == Email
                    select x.emailid).Count<string>() != 0)
                {
                    string str1 = string.Concat("https://scholarlybook.com/User/ResetPassword?EmailId=", Email);
                    string str2 = string.Concat("Hi ! <br/> Please Click the below link to reset your password.<br/> <br/>  <a href=\"", str1, "\" > <br/>Scholarly Web Book. </a> <br/> <br/> Thanks <br/> Scholarly Web Book .<br/>");
                    var appSettings = _config.GetSection("Appsetting");
                    string str3 = appSettings["MailServerName"].ToString();
                    string str4 = appSettings["SMTPUser"].ToString(); ;
                    NetworkCredential networkCredential = new NetworkCredential()
                    {
                        UserName = "pdfannotation@gmail.com",
                        Password = "pdf@annotate"
                    };
                    string str5 = "Reset Password";
                    string str6 = "pdfannotation@gmail.com";
                    string email = Email;
                    try
                    {
                        using (MailMessage mailMessage = new MailMessage(str6, email, str5, str2))
                        {
                            mailMessage.IsBodyHtml = true;
                            (new SmtpClient(str3)
                            {
                                EnableSsl = true,
                                DeliveryMethod = SmtpDeliveryMethod.Network,
                                UseDefaultCredentials = false,
                                Credentials = networkCredential,
                                Port = Convert.ToInt32(appSettings["MailServerPort"])
                            }).Send(mailMessage);
                        }
                    }
                    catch (FormatException formatException)
                    {
                        _logger.Error(formatException.Message);
                    }
                }
                else
                {
                    str = "Email does not Exist";
                }
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(str);
        }

        [HttpGet]
        [Route("feedback")]
        public ActionResult FeedBack(int userID)
        {
            tbl_users? tblUser = (
                from u in _swbDBContext.tbl_users
                where u.userid == userID
                select u).FirstOrDefault<tbl_users>();
            
            return Ok(tblUser);
        }

        [HttpGet]
        [Route("getcounts")]
        public async Task<ActionResult> GetCounts()
        {
            try
            {
                return Ok(_IUserDa.GetCounts(_swbDBContext));
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return null;
        }

        [HttpGet]
        [Route("getspecializations")]
        public async Task<ActionResult> GetSpecializations()
        {

            List<UserLogin>? userLogins = null;
            try
            {
                userLogins=await _IUserDa.GetSpecializations(_swbDBContext);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(userLogins);
        }

        [HttpGet]
        [Route("getuserdetails")]
        public async Task<ActionResult> GetUserDetails(string UserId)
        {
            UserLogin? userLogin = new UserLogin();
            
            try
            {
                userLogin = await _IUserDa.GetUserDetails(_swbDBContext,UserId);
            }
            catch (Exception exception)
            {
                _logger.Error(exception.Message);
            }
            return Ok(userLogin);
        }
    }
}
 
