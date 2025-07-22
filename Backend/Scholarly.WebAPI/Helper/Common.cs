using Microsoft.Extensions.Logging;
using NLog;
using Scholarly.WebAPI.Model;
using System.Net.Mail;
using System.Net;
using System.Security.Claims;

namespace Scholarly.WebAPI.Helper
{
    public class Common
    {
        public static CurrentContext GetCurrentContext(ClaimsIdentity identity)
        {
            var currentContext = new CurrentContext();
            IEnumerable<Claim> claims = identity.Claims;

            currentContext.UserId = Convert.ToInt32(identity.FindFirst("UserId").Value);
            currentContext.User = Convert.ToString(identity.FindFirst("User").Value);
            currentContext.UserMail = Convert.ToString(identity.FindFirst("UserMail").Value);
            return currentContext;
        }

        public static string CreateDownloadFolders(string downloadPath, Logger logger)
        {
            try
            {
                if (!Directory.Exists(downloadPath))
                {
                    Directory.CreateDirectory(downloadPath);
                }
            }
            catch (Exception ex)
            {
                logger.Error(ex.Message);
            }
            return downloadPath;
        }

        public static void SendEmail(Logger logger,string email, string? activationCode)
        {
            try
            {
                string str = "Hi ! <br/> Thank you for registering with Scholarly Web book . Please click on the below link to Login to your account .<br/><br/><a href=https://scholarlybook.com/> https://scholarlybook.com/ </a> <br/><br/><br/>Thanks <br/>Scholarly Web Book.";
                MailMessage mailMessage = new MailMessage();
                mailMessage.To.Add(new MailAddress(email));
                mailMessage.From = new MailAddress("pdfannotation@gmail.com");
                mailMessage.Subject = "Registration successful";
                mailMessage.Body = string.Format(str, new object[0]);
                mailMessage.IsBodyHtml = true;
                using (SmtpClient smtpClient = new SmtpClient())
                {
                    smtpClient.Host = "smtp.gmail.com";
                    smtpClient.Port = 587;
                    smtpClient.EnableSsl = true;
                    smtpClient.Credentials = new NetworkCredential()
                    {
                        //UserName = "pdfannotation@gmail.com",
                        //Password = "pdf@annotate"
                        UserName = "glitzdocuments@gmail.com",
                        Password = "gmss ojot vrwq ilph"
                    };
                    smtpClient.Send(mailMessage);
                }
            }
            catch (Exception exception)
            {
                logger.Error(exception.Message);
            }
        }
    }
}
