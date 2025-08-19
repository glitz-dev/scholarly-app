using Microsoft.Extensions.Configuration;
using Scholarly.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Scholarly.WebAPI.Helper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Newtonsoft.Json.Serialization;
using NLog.Web;
using NLog;
using Scholarly.WebAPI.DataAccess;
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;


var builder = WebApplication.CreateBuilder(args);

ConfigurationManager configuration = builder.Configuration;
var appSettings = configuration.GetSection("Appsetting");
int sessionTimout = appSettings["SessionTimout"] != null ? Convert.ToInt32(appSettings["SessionTimout"]) : 20;

// Add services to the container.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.KnownProxies.Add(IPAddress.Parse("10.0.0.100"));
});
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<SWBDBContext>(option => option.UseNpgsql(configuration["ConnectionStrings:DefaultConnection"]));
builder.Services.AddSingleton<IJWTAuthenticationManager>(new JWTAuthenticationManager(configuration));
builder.Services.AddTransient<IPDFHelper, PDFHelper>();
builder.Services.AddTransient<IPdfDa, PdfDa>();
builder.Services.AddTransient<IUserDa,UserDa>();
builder.Services.AddTransient<IGeminiService, GeminiService>();
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ContractResolver = new DefaultContractResolver();
    });
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(o =>
{
    o.RequireHttpsMetadata = false;
    var key = Encoding.UTF8.GetBytes("qk6McRhZFLF9S3OwEuJeCslLWKaqVsDiGQIfuGJKZsI=");
    o.SaveToken = true;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.Zero,
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});
// enable CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("allowAll", policy =>
    {
        policy.WithOrigins("https://localhost:3000/")
            .AllowCredentials()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
        
});


GlobalDiagnosticsContext.Set("NLogDb", configuration["ConnectionStrings:DefaultConnection"]);
// Add NLog
builder.Logging.ClearProviders();
builder.Host.UseNLog();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(/*c => {
      c.SwaggerEndpoint("/swagger/v1/scholarly-swagger.json", "ScholarlyApi");
      c.RoutePrefix=string.Empty;
    }*/);
    app.UseDeveloperExceptionPage();
}
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseCors("allowAll");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
