using Microsoft.IdentityModel.Tokens;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Scholarly.WebAPI.Helper
{
    public interface IJWTAuthenticationManager
    {
        Task<Scholarly.WebAPI.Model.AuthResponse> AuthenticateAsync(tbl_users tblUserr, SWBDBContext swbDBContext);
    }

    public class JWTAuthenticationManager : IJWTAuthenticationManager
    {
        private readonly IConfiguration _configuration;
        public JWTAuthenticationManager(IConfiguration configuration)
        {
            _configuration = configuration;

        }
        public async Task<Scholarly.WebAPI.Model.AuthResponse> AuthenticateAsync(tbl_users tblUser, SWBDBContext swbDBContext)
        {
            var appSettings = _configuration.GetSection("Appsetting");
            int jwtExpires = appSettings["SessionTimout"] != null ? Convert.ToInt32(appSettings["SessionTimout"]) : 20;
            var response = new Scholarly.WebAPI.Model.AuthResponse();
            var now = DateTime.Now;

            var claims = new List<Claim>();
            claims.Add(new Claim("UserId", tblUser.userid.ToString()));
            claims.Add(new Claim("User", tblUser.firstname));
            claims.Add(new Claim("UserMail", tblUser.emailid));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("qk6McRhZFLF9S3OwEuJeCslLWKaqVsDiGQIfuGJKZsI="));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "yourdomain.com",
                audience: "yourdomain.com",
                claims: claims,
                expires: DateTime.Now.AddMinutes(jwtExpires),
                signingCredentials: creds);

            response.status = true;
            response.message = "Valid consumer";
            response.expires = now.Add(TimeSpan.FromMinutes(jwtExpires));
            response.token = new JwtSecurityTokenHandler().WriteToken(token);
            response.emailId = tblUser.emailid;
            response.refreshToken = "";//generateRefreshToken("1");

            return response;
        }
    }

}
