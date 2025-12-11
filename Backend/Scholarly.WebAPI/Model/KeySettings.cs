namespace Scholarly.WebAPI.Model
{
    /// <summary>
    /// DEPRECATED: Use IConfiguration to read JWT settings from appsettings.json instead.
    /// This class is kept for backwards compatibility only.
    /// </summary>
    public static class KeySettings
    {
        [Obsolete("Use IConfiguration[\"Jwt:SecretKey\"] instead. This will be removed in a future version.")]
        public static string JWT_secret_key { get; set; } = "CONFIGURE_IN_APPSETTINGS_JSON";
    }
}
