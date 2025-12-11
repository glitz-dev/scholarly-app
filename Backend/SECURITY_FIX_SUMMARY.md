# Security Fix: CurrentContext-Based User Authentication

## 🔒 Critical Security Vulnerability Fixed

### The Problem

Previously, API endpoints accepted `userId` as a URL parameter, allowing potential unauthorized access:

```csharp
// ❌ INSECURE - Before
[HttpGet("{userId}")]
[Authorize]
public async Task<ActionResult<UserDto>> GetUserDetailsById(int userId)
{
    // Any authenticated user could access ANY user's data
    // by manipulating the userId parameter in the URL
    var user = await _userService.GetUserDetailsAsync(userId);
    return Ok(user);
}
```

**Attack Scenario:**
1. User A (ID: 123) authenticates and gets a valid JWT token
2. User A calls `GET /api/user/456` 
3. System returns User B's (ID: 456) private data
4. User A can read/modify other users' profiles!

---

## ✅ The Solution

Use `CurrentContext` to extract the authenticated user's ID from the JWT token:

```csharp
// ✅ SECURE - After
[HttpGet("me")]
[Authorize]
public async Task<ActionResult<UserDto>> GetMyProfile()
{
    // UserId comes from JWT token claims (trusted source)
    // User can ONLY access their own data
    var user = await _userService.GetUserDetailsAsync(_currentContext.UserId);
    return Ok(user);
}
```

**How It Works:**
1. User A authenticates with valid credentials
2. JWT token is issued with claims: `{ "UserId": "123", "UserMail": "userA@example.com" }`
3. On subsequent requests, `CurrentContext` extracts `UserId` from the JWT token
4. User A can **ONLY** access/modify their own data (ID: 123)

---

## Implementation Details

### UserController.cs Changes

#### 1. Added CurrentContext Dependency

```csharp
private readonly CurrentContext _currentContext;

public UserController(
    // ... other dependencies
    IHttpContextAccessor httpContextAccessor)
{
    // ... other initializations
    _currentContext = Common.GetCurrentContext(
        httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity);
}
```

#### 2. Secure User Endpoints

```csharp
// Get authenticated user's own profile
[HttpGet("me")]
[Authorize]
public async Task<ActionResult<UserDto>> GetMyProfile()
{
    var user = await _userService.GetUserDetailsAsync(_currentContext.UserId);
    return Ok(user);
}

// Update authenticated user's own profile
[HttpPut("me")]
[Authorize]
public async Task<ActionResult> UpdateMyProfile([FromBody] UpdateUserDto updateDto)
{
    await _userService.UpdateUserDetailsAsync(_currentContext.UserId, updateDto);
    return Ok(new { Message = "Profile updated successfully" });
}
```

#### 3. Admin Endpoints (Role-Based)

For legitimate admin operations that need to access any user's data:

```csharp
[HttpGet("admin/{userId}")]
[Authorize(Roles = "Admin")]
public async Task<ActionResult<UserDto>> GetUserDetailsAdmin(int userId)
{
    _controllerLogger.LogInformation("Admin {AdminId} accessing user {UserId}", 
        _currentContext.UserId, userId);
    var user = await _userService.GetUserDetailsAsync(userId);
    return Ok(user);
}
```

---

## API Route Changes

### Before (Insecure)
```
GET /api/user/123    ❌ Can access any user
PUT /api/user/123    ❌ Can update any user
```

### After (Secure)
```
GET /api/user/me           ✅ Access only your own profile
PUT /api/user/me           ✅ Update only your own profile
GET /api/user/admin/123    ✅ Admin can access user 123
PUT /api/user/admin/123    ✅ Admin can update user 123
```

---

## Security Benefits

1. **Authorization Enforcement**
   - Users can only access their own data
   - No way to manipulate userId parameter
   - JWT token is the single source of truth

2. **Audit Trail**
   - All actions logged with authenticated user's ID
   - Clear attribution of who did what

3. **Principle of Least Privilege**
   - Users have minimal access (only to their own data)
   - Admin operations clearly separated and protected

4. **Defense in Depth**
   - Even if authorization checks are bypassed, userId still comes from trusted JWT
   - Multiple layers of security

---

## Testing Recommendations

### 1. Test User Endpoints
```bash
# Login as User A
POST /api/account/login
{ "EmailID": "userA@example.com", "Password": "password" }
# Response: { "token": "eyJ..." }

# Get own profile (should succeed)
GET /api/user/me
Authorization: Bearer eyJ...
# Response: { "UserId": 123, "FirstName": "User A", ... }

# Update own profile (should succeed)
PUT /api/user/me
Authorization: Bearer eyJ...
{ "FirstName": "Updated Name" }
```

### 2. Test Security (Negative Test)
```bash
# Login as User A
# Try to access User B's profile by manipulating URL
GET /api/user/456
# This route no longer exists - returns 404

# The only way to access user data is through:
GET /api/user/me  # Returns User A's data (ID: 123)
```

### 3. Test Admin Endpoints
```bash
# Login as Admin
POST /api/account/login
{ "EmailID": "admin@example.com", "Password": "adminpass" }

# Admin can access any user
GET /api/user/admin/456
Authorization: Bearer <admin-token>
# Response: { "UserId": 456, "FirstName": "User B", ... }
```

---

## Migration Guide for Frontend

### Before
```javascript
// ❌ Old API calls
const userId = 123;
fetch(`/api/user/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

fetch(`/api/user/${userId}`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(updatedData)
});
```

### After
```javascript
// ✅ New API calls (no userId needed!)
fetch('/api/user/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

fetch('/api/user/me', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(updatedData)
});
```

---

## Similar Pattern in Other Controllers

This security pattern is already implemented in:

1. **PDFController** - Uses `_currentContext.UserId` for PDF operations
2. **GroupController** - Uses `_currentContext.UserId` for group operations
3. **ProjectController** - Uses `_currentContext.UserId` for project operations
4. **AnnotationController** - Uses `_currentContext.UserId` for annotations
5. **UserProfileController** - Has `/me` endpoint using `_currentContext.UserId`

---

## Compliance & Standards

This implementation follows:

- ✅ **OWASP Top 10** - Broken Access Control prevention
- ✅ **OAuth 2.0 / JWT Best Practices** - Trust token claims, not request parameters
- ✅ **Principle of Least Privilege** - Users have minimal necessary access
- ✅ **RESTful API Standards** - `/me` pattern for self-referencing resources

---

## Build Status

✅ **Build Succeeded** - All security changes compile successfully with 0 errors

