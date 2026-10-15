using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.CookiePolicy;
using Microsoft.IdentityModel.Tokens;
using OpenArms.Api;
using OpenArms.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var configuredPort = Environment.GetEnvironmentVariable("BACKEND_PORT")
    ?? Environment.GetEnvironmentVariable("PORT")
    ?? Environment.GetEnvironmentVariable("WEBSITES_PORT");
var iisAssignedPort = Environment.GetEnvironmentVariable("ASPNETCORE_PORT");
var aspNetCoreUrls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");

if (string.IsNullOrWhiteSpace(iisAssignedPort) && string.IsNullOrWhiteSpace(aspNetCoreUrls))
{
    var port = configuredPort ?? "5215";
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
    ?? builder.Configuration["Supabase:Url"] ?? "";
var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
    ?? builder.Configuration["Supabase:ServiceRoleKey"] ?? "";
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"]
    ?? "";

builder.Services.AddSingleton(new SupabaseService(supabaseUrl, supabaseKey));
builder.Services.AddSingleton(new AuthService(jwtKey,
    builder.Configuration["Jwt:Issuer"] ?? "OpenArmsApi",
    builder.Configuration["Jwt:Audience"] ?? "OpenArmsClient",
    int.Parse(builder.Configuration["Jwt:ExpiryHours"] ?? "168")));

var authenticationBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
});

// Auth session cookie: HttpOnly JWT (see AuthSessionCookie). Not ASP.NET Identity — there is no ConfigureApplicationCookie here.
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.HttpOnly = HttpOnlyPolicy.Always;
});

authenticationBuilder
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) &&
                    context.Request.Cookies.TryGetValue(AuthSessionCookie.Name, out var fromCookie) &&
                    !string.IsNullOrEmpty(fromCookie))
                    context.Token = fromCookie;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("InternalStaff", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            context.User.Claims.Any(claim =>
                claim.Type == ClaimTypes.Role &&
                (string.Equals(claim.Value?.Trim(), "admin", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(claim.Value?.Trim(), "staff", StringComparison.OrdinalIgnoreCase))));
    });

    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            context.User.Claims.Any(claim =>
                claim.Type == ClaimTypes.Role &&
                string.Equals(claim.Value?.Trim(), "staff", StringComparison.OrdinalIgnoreCase)));
    });

    options.AddPolicy("DonorOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            context.User.Claims.Any(claim =>
                claim.Type == ClaimTypes.Role &&
                string.Equals(claim.Value?.Trim(), "donor", StringComparison.OrdinalIgnoreCase)));
    });

    options.AddPolicy("DonorOrInternalStaff", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            context.User.Claims.Any(claim =>
                claim.Type == ClaimTypes.Role &&
                (string.Equals(claim.Value?.Trim(), "donor", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(claim.Value?.Trim(), "admin", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(claim.Value?.Trim(), "staff", StringComparison.OrdinalIgnoreCase))));
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.UseCookiePolicy();

app.Use(async (context, next) =>
{
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.azurewebsites.net;";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// Only redirect to HTTPS when HTTPS is actually configured. Dev runs HTTP-only (see launchSettings);
// UseHttpsRedirection here breaks /api calls from the Vite proxy and logs "Failed to determine the https port".
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
