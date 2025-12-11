using NLog;
using NLog.Config;
using NLog.Targets;
using Scholarly.WebAPI.Model;

namespace Scholarly.WebAPI.Helper
{
    public static class LoggingHelper
    {
        /// <summary>
        /// Configures NLog based on application settings
        /// </summary>
        public static void ConfigureNLog(LoggingSettings settings)
        {
            var config = LogManager.Configuration ?? new LoggingConfiguration();

            // Configure log levels based on settings
            var minLevel = ParseLogLevel(settings.MinimumLogLevel);

            // Enable/Disable targets based on settings
            if (!settings.EnableConsoleLogging)
            {
                DisableTarget(config, "logconsole");
            }

            if (!settings.EnableFileLogging)
            {
                DisableTarget(config, "logfile");
            }

            if (!settings.EnableDatabaseLogging)
            {
                DisableTarget(config, "logdatabase");
            }

            // Apply configuration
            LogManager.Configuration = config;
        }

        /// <summary>
        /// Parses string log level to NLog LogLevel
        /// </summary>
        private static NLog.LogLevel ParseLogLevel(string level)
        {
            return level?.ToLower() switch
            {
                "trace" => NLog.LogLevel.Trace,
                "debug" => NLog.LogLevel.Debug,
                "information" or "info" => NLog.LogLevel.Info,
                "warning" or "warn" => NLog.LogLevel.Warn,
                "error" => NLog.LogLevel.Error,
                "fatal" or "critical" => NLog.LogLevel.Fatal,
                _ => NLog.LogLevel.Info
            };
        }

        /// <summary>
        /// Disables a specific logging target
        /// </summary>
        private static void DisableTarget(LoggingConfiguration config, string targetName)
        {
            var target = config.FindTargetByName(targetName);
            if (target != null)
            {
                foreach (var rule in config.LoggingRules.Where(r => r.Targets.Contains(target)).ToList())
                {
                    rule.Targets.Remove(target);
                }
            }
        }

        /// <summary>
        /// Creates a structured log message with additional context
        /// </summary>
        public static string CreateStructuredMessage(string message, object? context = null)
        {
            if (context == null)
                return message;

            var contextJson = System.Text.Json.JsonSerializer.Serialize(context);
            return $"{message} | Context: {contextJson}";
        }

        /// <summary>
        /// Log performance metrics
        /// </summary>
        public static void LogPerformance(Logger logger, string operation, long milliseconds, object? additionalData = null)
        {
            var message = $"Performance: {operation} took {milliseconds}ms";
            if (additionalData != null)
            {
                message = CreateStructuredMessage(message, additionalData);
            }
            logger.Info(message);
        }

        /// <summary>
        /// Log business event
        /// </summary>
        public static void LogBusinessEvent(Logger logger, string eventName, string userId, object? eventData = null)
        {
            var context = new
            {
                EventName = eventName,
                UserId = userId,
                Timestamp = DateTime.UtcNow,
                Data = eventData
            };
            logger.Info(CreateStructuredMessage($"Business Event: {eventName}", context));
        }
    }
}

