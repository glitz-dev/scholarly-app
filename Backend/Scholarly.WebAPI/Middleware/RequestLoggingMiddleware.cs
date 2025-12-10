using NLog;
using System.Diagnostics;

namespace Scholarly.WebAPI.Middleware
{
    /// <summary>
    /// Middleware to log all incoming HTTP requests with performance metrics
    /// Can be enabled/disabled via appsettings.json
    /// </summary>
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;
        private static readonly Logger _nLogger = LogManager.GetCurrentClassLogger();

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            var requestPath = context.Request.Path;
            var requestMethod = context.Request.Method;
            var requestId = Guid.NewGuid().ToString();

            // Log request start
            _logger.LogInformation(
                "Request Started: {RequestId} {Method} {Path}",
                requestId,
                requestMethod,
                requestPath
            );

            try
            {
                // Call the next middleware in the pipeline
                await _next(context);

                stopwatch.Stop();

                // Log successful request completion
                _logger.LogInformation(
                    "Request Completed: {RequestId} {Method} {Path} - Status: {StatusCode} - Duration: {Duration}ms",
                    requestId,
                    requestMethod,
                    requestPath,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds
                );

                // Log performance warning if request took too long
                if (stopwatch.ElapsedMilliseconds > 3000)
                {
                    _logger.LogWarning(
                        "Slow Request Detected: {RequestId} {Method} {Path} - Duration: {Duration}ms",
                        requestId,
                        requestMethod,
                        requestPath,
                        stopwatch.ElapsedMilliseconds
                    );
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();

                // Log error
                _logger.LogError(
                    ex,
                    "Request Failed: {RequestId} {Method} {Path} - Duration: {Duration}ms",
                    requestId,
                    requestMethod,
                    requestPath,
                    stopwatch.ElapsedMilliseconds
                );

                throw; // Re-throw to let global exception handler catch it
            }
        }
    }

    /// <summary>
    /// Extension method to add request logging middleware
    /// </summary>
    public static class RequestLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<RequestLoggingMiddleware>();
        }
    }
}

