using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Scholarly.DataAccess;
using Scholarly.Entity;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using System.Security.Claims;
using Scholarly.WebAPI.Model;
using Scholarly.WebAPI.Helper;
using Microsoft.AspNetCore.Cors;

namespace Scholarly.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("allowAll")]
    public class AccountController : ControllerBase
    {
        private readonly SWBDBContext _swbDBContext;
        private readonly IConfiguration _config;
        private readonly IJWTAuthenticationManager _jWTAuthenticationManager;
        public AccountController(IConfiguration configuration, SWBDBContext swbDBContext,IJWTAuthenticationManager jWTAuthenticationManager)
        {
            _config = configuration;
            _swbDBContext = swbDBContext;
            _jWTAuthenticationManager = jWTAuthenticationManager;
        }
        [HttpPost]
        [Route("Login")]
        //[ValidateAntiForgeryToken]
        public ActionResult Login(UserLogin login)
        {
            ActionResult action;
            string str = "";
            if (!string.IsNullOrWhiteSpace(login.EmailID) && !string.IsNullOrWhiteSpace(login.Password))
            {
                tbl_users? tblUser = (
                    from a in _swbDBContext.tbl_users
                    where a.emailid == login.EmailID
                    select a).FirstOrDefault<tbl_users>();
                if (tblUser == null)
                {
                    return Ok(new {Message = "User Not Exist" });
                }
                else
                {
                    if (!PasswordHasher.VerifyPassword(tblUser.password, login.Password))
                    {
                        return Ok(new { Message = "Invalid credential provided" } );
                    }
                    else
                    {

                        var reponse = _jWTAuthenticationManager.AuthenticateAsync(tblUser, _swbDBContext);

                        return Ok(reponse.Result);
                    }
                }
            }
            return Ok("");
        }
    }
}
