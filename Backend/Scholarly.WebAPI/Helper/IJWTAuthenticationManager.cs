using Microsoft.IdentityModel.Tokens;
using NLog;
using Scholarly.DataAccess;
using Scholarly.Entity;
using Scholarly.WebAPI.Model;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Scholarly.WebAPI.Helper
{
    public interface IJWTAuthenticationManager
    {
        Task<Scholarly.WebAPI.Model.AuthResponse> AuthenticateAsync(tbl_users tblUserr, SWBDBContext swbDBContext);
        string GenerateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
        Task<TokenModel> RefreshApi(TokenModel tokenModel, SWBDBContext swbDBContext);
    }

    public class JWTAuthenticationManager : IJWTAuthenticationManager
    {

        private readonly IConfiguration _configuration;
        private static Logger _logger = LogManager.GetCurrentClassLogger();
        public JWTAuthenticationManager(IConfiguration configuration)
        {
            _configuration = configuration;

        }
        public async Task<Scholarly.WebAPI.Model.AuthResponse> AuthenticateAsync(tbl_users tblUser, SWBDBContext swbDBContext)
        {
            var appSettings = _configuration.GetSection("Appsetting");
            int jwtExpires = appSettings["SessionTimout"] != null ? Convert.ToInt32(appSettings["SessionTimout"]) : 20;
            int refresh_token_expiry = appSettings["RefreshTokenTimout"] != null ? Convert.ToInt32(appSettings["RefreshTokenTimout"]) : 7;
            var response = new Scholarly.WebAPI.Model.AuthResponse();
            var now = DateTime.Now;

            var claims = new List<Claim>();
            claims.Add(new Claim("UserId", tblUser.userid.ToString()));
            claims.Add(new Claim("User", tblUser.firstname ?? ""));
            claims.Add(new Claim("UserMail", tblUser.emailid));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("qk6McRhZFLF9S3OwEuJeCslLWKaqVsDiGQIfuGJKZsI="));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "yourdomain.com",
                audience: "yourdomain.com",
                claims: claims,
                expires: DateTime.Now.AddMinutes(jwtExpires),
                signingCredentials: creds);

             // Refresh Token
             var refreshToken = GenerateRefreshToken();
            tblUser.refresh_token = refreshToken;
            tblUser.refresh_token_expiry_time = DateTime.UtcNow.AddDays(refresh_token_expiry);
            await swbDBContext.SaveChangesAsync();

            response.status = true;
            response.message = "Valid consumer";
            response.expires = now.Add(TimeSpan.FromMinutes(jwtExpires));
            response.token = new JwtSecurityTokenHandler().WriteToken(token);
            response.emailId = tblUser.emailid;
            response.refreshToken = refreshToken;

            return response;
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
                return Convert.ToBase64String(randomNumber);
            }
        }

        public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("qk6McRhZFLF9S3OwEuJeCslLWKaqVsDiGQIfuGJKZsI=")),
                ValidateLifetime = false // we want to get claims from expired token
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
            var jwtSecurityToken = securityToken as JwtSecurityToken;

            if (jwtSecurityToken == null ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");

            return principal;
        }

        public async Task<TokenModel> RefreshApi(TokenModel tokenModel, SWBDBContext _swbDBContext)
        {
            var principal = GetPrincipalFromExpiredToken(tokenModel.AccessToken);
            if (principal == null)
            {
                _logger.Error("Invalid access token provided for refresh.");
                return null;
            }

            string email = principal.Claims.FirstOrDefault(c => c.Type == "UserMail")?.Value;

            var user = _swbDBContext.tbl_users.FirstOrDefault(u => u.emailid == email);
            if (user == null)
            {
                _logger.Error("User not found for email: {Email}", email);
                return null;
            }

            if (user.refresh_token != tokenModel.RefreshToken || user.refresh_token_expiry_time <= DateTime.Now)
            {
                _logger.Error("Invalid refresh token");
            }
            // Generate new tokens
            var authResponse = await AuthenticateAsync(user, _swbDBContext);
            var newRefreshToken = GenerateRefreshToken();

            // Update DB
            user.refresh_token = newRefreshToken;
            await _swbDBContext.SaveChangesAsync();

            return new TokenModel
            {
                AccessToken = authResponse.token,
                RefreshToken = newRefreshToken
            };
        }
    }

}
