# 📝 Logging Configuration Guide

## Overview
The Scholarly application uses NLog for comprehensive logging with configuration controlled via `appsettings.json`. Logs can be written to Console, File, and Database simultaneously.

---

## 🎯 Quick Start

### Enabling/Disabling Logging Targets

Edit `appsettings.json`:

```json
{
  "LoggingSettings": {
    "EnableConsoleLogging": true,    // Console output
    "EnableFileLogging": true,       // File logs
    "EnableDatabaseLogging": true,   // Database logs
    "MinimumLogLevel": "Information",
    "RetentionDays": 7
  }
}
```

### Log Levels (in order of severity)

1. **Trace** - Very detailed logs (not recommended for production)
2. **Debug** - Debug information (development only)
3. **Information** - General informational messages
4. **Warning** - Warning messages
5. **Error** - Error messages
6. **Fatal/Critical** - Fatal errors

---

## 📁 Configuration Files

### 1. appsettings.json (Production)
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "LoggingSettings": {
    "EnableConsoleLogging": true,
    "EnableFileLogging": true,
    "EnableDatabaseLogging": true,
    "MinimumLogLevel": "Information"
  }
}
```

### 2. appsettings.Development.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Scholarly": "Debug"
    }
  },
  "LoggingSettings": {
    "EnableDatabaseLogging": false,  // Disable DB logging in dev
    "MinimumLogLevel": "Debug"
  }
}
```

### 3. appsettings.Production.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Scholarly": "Information"
    }
  },
  "LoggingSettings": {
    "EnableConsoleLogging": false,   // Disable console in production
    "MinimumLogLevel": "Warning",
    "RetentionDays": 30
  }
}
```

---

## 🎨 Logging Targets

### 1. Console Logging
**Enabled by:** `EnableConsoleLogging: true`

**Features:**
- Color-coded by severity
- Real-time output
- Best for development

**Format:**
```
2024-11-17 10:30:45.1234|INFO|Scholarly.WebAPI.Services.UserService|User logged in successfully: user@example.com
```

### 2. File Logging
**Enabled by:** `EnableFileLogging: true`

**Location:** `logs/scholarly-{date}.log`

**Features:**
- Daily rolling files
- Archives old logs to `logs/archives/`
- Keeps last 7 days by default
- Includes request URLs and action names

**Format:**
```
2024-11-17 10:30:45.1234|INFO|Scholarly.WebAPI.Services.UserService|User logged in successfully|/api/account/login|Login
```

### 3. Database Logging
**Enabled by:** `EnableDatabaseLogging: true`

**Table:** `Log` (PostgreSQL)

**Setup:**
1. Run the SQL script: `db/CREATE_LOG_TABLE.sql`
2. Verify connection string in `appsettings.json`
3. Enable in LoggingSettings

**Columns:**
- Id, Logged, Level, Message, Logger, Exception
- UserName, Url, ServerName, CreatedAt

---

## 💻 Usage Examples

### Basic Logging in Services

```csharp
public class UserService : IUserService
{
    private readonly ILogger<UserService> _logger;
    
    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
    }
    
    public async Task<UserDto> RegisterAsync(RegisterDto dto)
    {
        // Information log
        _logger.LogInformation("Attempting to register user: {Email}", dto.EmailID);
        
        try
        {
            // Your logic here
            var user = await CreateUser(dto);
            
            // Success log
            _logger.LogInformation(
                "User registered successfully: {UserId} {Email}", 
                user.UserId, 
                user.EmailID
            );
            
            return user;
        }
        catch (Exception ex)
        {
            // Error log with exception
            _logger.LogError(
                ex, 
                "Failed to register user: {Email}", 
                dto.EmailID
            );
            throw;
        }
    }
}
```

### Structured Logging with Context

```csharp
using Scholarly.WebAPI.Helper;

// Log business event
LoggingHelper.LogBusinessEvent(
    logger, 
    "UserRegistration", 
    userId, 
    new { 
        Email = user.Email, 
        University = user.University 
    }
);

// Log performance
LoggingHelper.LogPerformance(
    logger, 
    "PDF Processing", 
    stopwatch.ElapsedMilliseconds,
    new { 
        FileName = fileName, 
        FileSize = fileSize 
    }
);
```

### Request Logging Middleware

Already configured! Every HTTP request is automatically logged:

```
2024-11-17 10:30:45.1234|INFO|Request Started: abc123-guid POST /api/account/login
2024-11-17 10:30:45.5678|INFO|Request Completed: abc123-guid POST /api/account/login - Status: 200 - Duration: 434ms
```

---

## 🔧 Advanced Configuration

### Filter Logs by Namespace

In `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Scholarly.WebAPI.Services": "Debug",        // Debug for services
      "Scholarly.WebAPI.Controllers": "Information", // Info for controllers
      "Microsoft": "Warning",                       // Warnings only for Microsoft
      "Microsoft.EntityFrameworkCore": "Error"      // Errors only for EF Core
    }
  }
}
```

### Change NLog Rules Dynamically

In `appsettings.json` > `NLog` > `rules`:

```json
{
  "NLog": {
    "rules": [
      {
        "logger": "Scholarly.WebAPI.Services.*",
        "minLevel": "Debug",
        "writeTo": "logfile"
      },
      {
        "logger": "*",
        "minLevel": "Error",
        "writeTo": "logdatabase,logfile"
      }
    ]
  }
}
```

### Add Custom Log Properties

```csharp
using NLog;

var logger = LogManager.GetCurrentClassLogger();

logger.WithProperty("UserId", userId)
      .WithProperty("TenantId", tenantId)
      .Info("Custom properties added");
```

---

## 📊 Querying Database Logs

### Recent Errors
```sql
SELECT * FROM Log 
WHERE Level = 'Error' 
ORDER BY Logged DESC 
LIMIT 50;
```

### Logs by User
```sql
SELECT * FROM Log 
WHERE UserName = 'user@example.com' 
ORDER BY Logged DESC;
```

### Performance Issues (using custom messages)
```sql
SELECT * FROM Log 
WHERE Message LIKE '%Slow Request%'
ORDER BY Logged DESC;
```

### Use Pre-built Views
```sql
-- Recent logs (last 7 days)
SELECT * FROM vw_RecentLogs LIMIT 100;

-- Summary by level
SELECT * FROM vw_LogSummaryByLevel;
```

### Cleanup Old Logs
```sql
-- Delete logs older than 30 days
SELECT cleanup_old_logs(30);
```

---

## 🎭 Environment-Specific Behavior

### Development
- ✅ Console logging (colored)
- ✅ File logging (Debug level)
- ❌ Database logging (disabled to save DB space)
- 📊 Log Level: Debug
- 🎯 All application logs visible

### Production
- ❌ Console logging (disabled for performance)
- ✅ File logging (Information level)
- ✅ Database logging (Warning level)
- 📊 Log Level: Warning
- 🎯 Only warnings and errors logged

---

## 🔍 Troubleshooting

### Issue: No logs appearing in database
**Solution:**
1. Check `EnableDatabaseLogging` is `true`
2. Run `db/CREATE_LOG_TABLE.sql` to create table
3. Verify connection string in `appsettings.json`
4. Check `logs/internal-nlog.txt` for NLog errors

### Issue: Too many logs
**Solution:**
1. Increase `MinimumLogLevel` to "Warning" or "Error"
2. Add namespace-specific filters
3. Disable Console logging if not needed

### Issue: File logs not rotating
**Solution:**
Check `nlog.config`:
```xml
<target name="logfile" ... archiveEvery="Day" ... />
```

### Issue: Cannot find log files
**Solution:**
Log files are in: `{AppDirectory}/logs/scholarly-{date}.log`

---

## 📈 Best Practices

### DO ✅
- Use structured logging with parameters: `logger.LogInfo("User {UserId} logged in", userId)`
- Log at appropriate levels (don't log everything as Error)
- Include context in error logs
- Use the middleware for request/response logging
- Cleanup old logs periodically

### DON'T ❌
- Don't log sensitive data (passwords, tokens, credit cards)
- Don't use string interpolation: `logger.LogInfo($"User {userId} logged in")` ❌
- Don't log in tight loops (performance impact)
- Don't leave Debug logging on in production
- Don't ignore database log cleanup

---

## 🚀 Performance Tips

1. **Use Async Targets** - Already configured via `async="true"`
2. **Disable Unused Targets** - Set to `false` in LoggingSettings
3. **Filter Early** - Use namespace-specific log levels
4. **Archive Old Logs** - Use retention policies
5. **Use Conditional Logging**:
   ```csharp
   if (_logger.IsEnabled(LogLevel.Debug))
   {
       _logger.LogDebug("Expensive debug info: {Data}", GetExpensiveData());
   }
   ```

---

## 📚 Additional Resources

- [NLog Documentation](https://nlog-project.org/)
- [ASP.NET Core Logging](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/)
- [Structured Logging Best Practices](https://github.com/NLog/NLog/wiki/How-to-use-structured-logging)

---

## 🆘 Support

For issues or questions:
1. Check `logs/internal-nlog.txt` for NLog internal errors
2. Review this guide
3. Check application logs in `logs/` directory
4. Query database logs for specific errors

---

**Last Updated:** November 17, 2024  
**NLog Version:** 5.x  
**Configuration:** appsettings.json based

