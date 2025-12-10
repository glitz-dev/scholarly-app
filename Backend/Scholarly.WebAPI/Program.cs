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
using Npgsql;
using Scholarly.WebAPI.Model;
using Scholarly.DataAccess.Repositories;
using Scholarly.WebAPI.Services;
using Scholarly.WebAPI.Middleware;
using FluentValidation;
using FluentValidation.AspNetCore;


var builder = WebApplication.CreateBuilder(args);

ConfigurationManager configuration = builder.Configuration;
var appSettings = configuration.GetSection("Appsetting");
int sessionTimout = appSettings["SessionTimout"] != null ? Convert.ToInt32(appSettings["SessionTimout"]) : 20;

// Add services to the container.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.KnownProxies.Add(IPAddress.Parse("10.0.0.100"));
});

// Add HttpContextAccessor
builder.Services.AddHttpContextAccessor();

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Add FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ContractResolver = new DefaultContractResolver();
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<SWBDBContext>(option => 
    option.UseNpgsql(configuration["ConnectionStrings:DefaultConnection"]));

// Repository Pattern
builder.Services.AddScoped(typeof(IReadRepository<>), typeof(Repository<>));
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Services
builder.Services.AddScoped<IUserService, UserService>();

// Legacy services (to be refactored)
builder.Services.AddSingleton<IJWTAuthenticationManager>(new JWTAuthenticationManager(configuration));
// Helper Services
builder.Services.AddTransient<IPDFHelper, PDFHelper>();

// Data Access Services
builder.Services.AddTransient<IPdfDa, PdfDa>();
builder.Services.AddTransient<IGroupDa, GroupDa>();
builder.Services.AddTransient<IProjectDa, ProjectDa>();
builder.Services.AddTransient<IAnnotationDa, AnnotationDa>();
builder.Services.AddTransient<IUserDa, UserDa>();

// AI Services
builder.Services.AddTransient<IGeminiService, GeminiService>();
builder.Services.AddTransient<IMetadataService, MetadataService>();

// JWT Authentication - TODO: Move secret to configuration
var jwtKey = configuration["Jwt:SecretKey"] ?? "qk6McRhZFLF9S3OwEuJeCslLWKaqVsDiGQIfuGJKZsI=";
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(o =>
{
    o.RequireHttpsMetadata = false;
    var key = Encoding.UTF8.GetBytes(jwtKey);
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

// CORS Policy - TODO: Make this more restrictive in production
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

NpgsqlConnection.GlobalTypeMapper.EnableDynamicJson();

// Configure NLog from appsettings.json
GlobalDiagnosticsContext.Set("NLogDb", configuration["ConnectionStrings:DefaultConnection"]);
builder.Logging.ClearProviders();
builder.Host.UseNLog();

// Configure logging settings
var loggingSettings = configuration.GetSection("LoggingSettings").Get<Scholarly.WebAPI.Model.LoggingSettings>();
if (loggingSettings != null)
{
    Scholarly.WebAPI.Helper.LoggingHelper.ConfigureNLog(loggingSettings);
}

var app = builder.Build();

// Configure the HTTP request pipeline.

// Global Exception Handler Middleware (should be first)
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Request Logging Middleware (optional - can be controlled via configuration)
// Comment out if not needed or add a configuration setting to enable/disable
app.UseRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(/*c => {
      c.SwaggerEndpoint("/swagger/v1/scholarly-swagger.json", "ScholarlyApi");
      c.RoutePrefix=string.Empty;
    }*/);
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
