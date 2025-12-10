namespace Scholarly.WebAPI.Model
{
    public class LoggingSettings
    {
        public bool EnableConsoleLogging { get; set; } = true;
        public bool EnableFileLogging { get; set; } = true;
        public bool EnableDatabaseLogging { get; set; } = true;
        public string MinimumLogLevel { get; set; } = "Information";
        public string LogFilePath { get; set; } = "logs";
        public int RetentionDays { get; set; } = 7;
    }
}

