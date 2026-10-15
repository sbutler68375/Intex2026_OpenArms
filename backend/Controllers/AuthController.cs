using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenArms.Api;
using OpenArms.Api.Models;
using OpenArms.Api.Services;

namespace OpenArms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    SupabaseService db,
    AuthService auth,
    IWebHostEnvironment env,
    IConfiguration configuration) : ControllerBase
{
    private void AppendAuthCookie(string token) =>
        Response.Cookies.Append(
            AuthSessionCookie.Name,
            token,
            AuthSessionCookie.CreateAppendOptions(configuration, env, Request));

    private void ClearAuthCookie() =>
        Response.Cookies.Delete(
            AuthSessionCookie.Name,
            AuthSessionCookie.CreateDeleteOptions(configuration, env, Request));

    private static string Esc(string value) => Uri.EscapeDataString(value);
    private static string? NormalizeRegion(string? region)
    {
        if (string.IsNullOrWhiteSpace(region)) return null;
        var r = region.Trim().ToLowerInvariant();
        if (r.Contains("mindanao")) return "Mindanao";
        if (r.Contains("visayas")) return "Visayas";
        if (r.Contains("luzon") || r.Contains("ncr") || r.Contains("calabarzon") || r.Contains("mimaropa") || r.Contains("barmm"))
            return "Luzon";
        if (region is "Luzon" or "Visayas" or "Mindanao") return region;
        return null;
    }
    private async Task<int> NextSupporterId()
    {
        var latest = await db.GetAllAsync<Supporter>("supporters", "select=supporter_id&order=supporter_id.desc&limit=1");
        return latest.Count == 0 ? 1 : (latest[0].SupporterId + 1);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username/email and password are required" });

        var loginValue = req.Username.Trim();
        var user = await db.GetOneAsync<User>("users",
            $"or=(username.eq.{Esc(loginValue)},email.eq.{Esc(loginValue)})&select=*");
        if (user == null || string.IsNullOrEmpty(user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password" });

        if (!AuthService.VerifyPassword(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password" });

        var token = auth.GenerateToken(user);
        AppendAuthCookie(token);
        return Ok(new LoginResponse(
            "",
            user.Username,
            user.DisplayName ?? user.Username,
            user.Role,
            user.Id,
            user.SupporterId));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        ClearAuthCookie();
        return Ok();
    }

    [HttpPost("register")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var (isValid, errors) = AuthService.ValidatePassword(req.Password);
        if (!isValid)
            return BadRequest(new { message = "Password does not meet requirements", errors });

        var existing = await db.GetOneAsync<User>("users", $"username=eq.{req.Username}");
        if (existing != null)
            return Conflict(new { message = "Username already exists" });

        var hash = AuthService.HashPassword(req.Password);
        var role = AuthService.NormalizeRole(req.Role);
        var user = await db.InsertAsync<User>("users", new
        {
            username = req.Username,
            password_hash = hash,
            display_name = req.DisplayName ?? req.Username,
            email = req.Email,
            role = string.IsNullOrWhiteSpace(role) ? "staff" : role
        });
        return Ok(user);
    }

    [HttpPost("register-donor")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterDonor([FromBody] RegisterDonorRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Password) ||
            string.IsNullOrWhiteSpace(req.SupporterType) ||
            string.IsNullOrWhiteSpace(req.Email))
        {
            return BadRequest(new { message = "Supporter type, email, and password are required" });
        }

        var (isValid, errors) = AuthService.ValidatePassword(req.Password);
        if (!isValid)
            return BadRequest(new { message = "Password does not meet requirements", errors });

        var username = string.IsNullOrWhiteSpace(req.Username) ? req.Email.Trim() : req.Username.Trim();
        var email = req.Email.Trim();

        var existingUser = await db.GetOneAsync<User>("users",
            $"or=(username.eq.{Esc(username)},email.eq.{Esc(email)})&select=id");
        if (existingUser != null)
            return Conflict(new { message = "An account with this username or email already exists" });

        var displayName = !string.IsNullOrWhiteSpace(req.DisplayName)
            ? req.DisplayName.Trim()
            : (!string.IsNullOrWhiteSpace(req.OrganizationName)
                ? req.OrganizationName.Trim()
                : $"{req.FirstName} {req.LastName}".Trim());

        var supporter = await db.InsertAsync<Supporter>("supporters", new
        {
            supporter_id = await NextSupporterId(),
            supporter_type = req.SupporterType,
            display_name = string.IsNullOrWhiteSpace(displayName) ? username : displayName,
            organization_name = req.OrganizationName,
            first_name = req.FirstName,
            last_name = req.LastName,
            relationship_type = req.RelationshipType ?? "Local",
            region = NormalizeRegion(req.Region),
            country = req.Country ?? "Philippines",
            email = email,
            phone = req.Phone,
            status = "Active",
            first_donation_date = req.FirstDonationDate,
            acquisition_channel = req.AcquisitionChannel ?? "Website",
            created_at = DateTime.UtcNow
        });

        if (supporter == null)
            return BadRequest(new { message = "Unable to create supporter profile. Account was not created." });

        var hash = AuthService.HashPassword(req.Password);
        var user = await db.InsertAsync<User>("users", new
        {
            username = username,
            password_hash = hash,
            display_name = string.IsNullOrWhiteSpace(displayName) ? username : displayName,
            email = email,
            role = "donor",
            is_active = true,
            created_at = DateTime.UtcNow,
            updated_at = DateTime.UtcNow,
            supporter_id = supporter.SupporterId
        });

        if (user == null)
            return BadRequest(new { message = "Unable to create account after supporter profile was created." });

        var token = auth.GenerateToken(user);
        AppendAuthCookie(token);
        return Ok(new LoginResponse(
            "",
            user.Username,
            user.DisplayName ?? user.Username,
            user.Role,
            user.Id,
            user.SupporterId));
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var username = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        var displayName = User.FindFirst("display_name")?.Value;
        var supporterId = User.FindFirst("supporter_id")?.Value;
        return Ok(new { id, username, role, displayName, supporterId });
    }
}
