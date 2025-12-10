-- Create Log table for NLog database logging
-- This table stores application logs in PostgreSQL database

-- Drop table if exists (for clean install)
-- DROP TABLE IF EXISTS Log;

-- Create Log table
CREATE TABLE IF NOT EXISTS Log (
    Id SERIAL PRIMARY KEY,
    Logged TIMESTAMP NOT NULL,
    Level VARCHAR(50) NOT NULL,
    Message TEXT,
    Logger VARCHAR(250),
    Exception TEXT,
    UserName VARCHAR(250),
    Url VARCHAR(1000),
    ServerName VARCHAR(250),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS IX_Log_Logged ON Log(Logged DESC);
CREATE INDEX IF NOT EXISTS IX_Log_Level ON Log(Level);
CREATE INDEX IF NOT EXISTS IX_Log_Logger ON Log(Logger);
CREATE INDEX IF NOT EXISTS IX_Log_UserName ON Log(UserName);
CREATE INDEX IF NOT EXISTS IX_Log_CreatedAt ON Log(CreatedAt DESC);

-- Add comments for documentation
COMMENT ON TABLE Log IS 'Application logs table for NLog database target';
COMMENT ON COLUMN Log.Id IS 'Primary key';
COMMENT ON COLUMN Log.Logged IS 'Timestamp when the log was recorded';
COMMENT ON COLUMN Log.Level IS 'Log level (Trace, Debug, Info, Warn, Error, Fatal)';
COMMENT ON COLUMN Log.Message IS 'Log message';
COMMENT ON COLUMN Log.Logger IS 'Logger name (usually the class name)';
COMMENT ON COLUMN Log.Exception IS 'Exception details if any';
COMMENT ON COLUMN Log.UserName IS 'Authenticated user name if available';
COMMENT ON COLUMN Log.Url IS 'Request URL if applicable';
COMMENT ON COLUMN Log.ServerName IS 'Server/machine name where log originated';
COMMENT ON COLUMN Log.CreatedAt IS 'Database timestamp';

-- Optional: Create a view for easy querying
CREATE OR REPLACE VIEW vw_RecentLogs AS
SELECT 
    Id,
    Logged,
    Level,
    LEFT(Message, 200) AS MessagePreview,
    Logger,
    CASE 
        WHEN Exception IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END AS HasException,
    UserName,
    ServerName,
    CreatedAt
FROM Log
WHERE Logged >= NOW() - INTERVAL '7 days'
ORDER BY Logged DESC;

-- Optional: Create cleanup procedure for old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM Log 
    WHERE Logged < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a summary view by level
CREATE OR REPLACE VIEW vw_LogSummaryByLevel AS
SELECT 
    Level,
    COUNT(*) AS LogCount,
    MAX(Logged) AS LastOccurrence,
    COUNT(DISTINCT DATE(Logged)) AS DaysWithLogs
FROM Log
WHERE Logged >= NOW() - INTERVAL '30 days'
GROUP BY Level
ORDER BY LogCount DESC;

-- Grant permissions (adjust as needed for your database user)
-- GRANT SELECT, INSERT ON Log TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE log_id_seq TO your_app_user;

-- Sample queries for testing

-- View recent errors
-- SELECT * FROM Log WHERE Level = 'Error' ORDER BY Logged DESC LIMIT 20;

-- View logs by user
-- SELECT * FROM Log WHERE UserName = 'someuser' ORDER BY Logged DESC;

-- View logs for specific logger (class)
-- SELECT * FROM Log WHERE Logger LIKE '%UserService%' ORDER BY Logged DESC;

-- Cleanup logs older than 30 days
-- SELECT cleanup_old_logs(30);

