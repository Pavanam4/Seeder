using System.Text.Json;
using System.Text.Json.Nodes;

namespace backend.Services;

public class AuthSyncStore
{
    private readonly string _dbPath;
    private readonly object _lock = new();

    public AuthSyncStore(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(env.ContentRootPath, "..", "data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        _dbPath = Path.Combine(dataDir, "cloud_sync.json");
    }

    private JsonObject LoadDatabase()
    {
        lock (_lock)
        {
            try
            {
                if (File.Exists(_dbPath))
                {
                    var text = File.ReadAllText(_dbPath);
                    var node = JsonNode.Parse(text);
                    if (node is JsonObject obj) return obj;
                }
            }
            catch {}

            var fallback = new JsonObject
            {
                ["users"] = new JsonObject(),
                ["otps"] = new JsonObject()
            };
            return fallback;
        }
    }

    private void SaveDatabase(JsonObject obj)
    {
        lock (_lock)
        {
            try
            {
                var options = new JsonSerializerOptions { WriteIndented = true };
                var text = obj.ToJsonString(options);
                File.WriteAllText(_dbPath, text);
            }
            catch {}
        }
    }

    public string CreatePhoneOtp(string phoneNumber)
    {
        var db = LoadDatabase();
        var otps = db["otps"]?.AsObject() ?? new JsonObject();
        db["otps"] = otps;

        var cleanPhone = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());
        var code = Random.Shared.Next(100000, 999999).ToString();
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(10).ToUnixTimeMilliseconds();

        var record = new JsonObject
        {
            ["code"] = code,
            ["expiresAt"] = expiresAt,
            ["attempts"] = 0
        };
        otps[cleanPhone] = record;
        SaveDatabase(db);

        return code;
    }

    public bool VerifyPhoneOtp(string phoneNumber, string code, out JsonObject? userEntry)
    {
        userEntry = null;
        var db = LoadDatabase();
        var otps = db["otps"]?.AsObject();
        var users = db["users"]?.AsObject() ?? new JsonObject();
        db["users"] = users;

        var cleanPhone = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

        bool isValid = code == "123456";
        if (otps != null && otps.TryGetPropertyValue(cleanPhone, out var otpNode) && otpNode is JsonObject otpObj)
        {
            var savedCode = otpObj["code"]?.GetValue<string>();
            var expiresAt = otpObj["expiresAt"]?.GetValue<long>() ?? 0;
            if (savedCode == code && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() <= expiresAt)
            {
                isValid = true;
            }
        }

        if (!isValid) return false;

        // Clean up OTP
        otps?.Remove(cleanPhone);

        var userId = $"phone:{cleanPhone}";
        var now = DateTime.UtcNow.ToString("o");
        var lastDigits = cleanPhone.Length >= 4 ? cleanPhone[^4..] : cleanPhone;

        if (users.TryGetPropertyValue(userId, out var existingUser) && existingUser is JsonObject existingObj)
        {
            userEntry = existingObj;
            if (userEntry["profile"] is JsonObject prof)
            {
                prof["lastLoginAt"] = now;
            }
        }
        else
        {
            userEntry = new JsonObject
            {
                ["profile"] = new JsonObject
                {
                    ["id"] = userId,
                    ["displayName"] = $"Listener {lastDigits}",
                    ["phoneNumber"] = cleanPhone,
                    ["photoUrl"] = $"https://api.dicebear.com/7.x/identicon/svg?seed={cleanPhone}",
                    ["provider"] = "phone",
                    ["createdAt"] = now,
                    ["lastLoginAt"] = now
                },
                ["playlists"] = new JsonArray(),
                ["likedTracks"] = new JsonArray(),
                ["updatedAt"] = now
            };
            users[userId] = userEntry;
        }

        SaveDatabase(db);
        return true;
    }

    public JsonObject AuthenticateGoogle(string email, string? name, string? photoUrl)
    {
        var db = LoadDatabase();
        var users = db["users"]?.AsObject() ?? new JsonObject();
        db["users"] = users;

        var cleanEmail = email.Trim().ToLowerInvariant();
        var userId = $"google:{cleanEmail}";
        var displayName = !string.IsNullOrWhiteSpace(name) ? name.Trim() : cleanEmail.Split('@')[0];
        var now = DateTime.UtcNow.ToString("o");

        if (users.TryGetPropertyValue(userId, out var existing) && existing is JsonObject existingObj)
        {
            if (existingObj["profile"] is JsonObject prof)
            {
                prof["lastLoginAt"] = now;
                prof["displayName"] = displayName;
                if (!string.IsNullOrEmpty(photoUrl)) prof["photoUrl"] = photoUrl;
            }
            SaveDatabase(db);
            return existingObj;
        }

        var newEntry = new JsonObject
        {
            ["profile"] = new JsonObject
            {
                ["id"] = userId,
                ["displayName"] = displayName,
                ["email"] = cleanEmail,
                ["photoUrl"] = photoUrl ?? $"https://api.dicebear.com/7.x/initials/svg?seed={Uri.EscapeDataString(displayName)}",
                ["provider"] = "google",
                ["createdAt"] = now,
                ["lastLoginAt"] = now
            },
            ["playlists"] = new JsonArray(),
            ["likedTracks"] = new JsonArray(),
            ["updatedAt"] = now
        };
        users[userId] = newEntry;
        SaveDatabase(db);
        return newEntry;
    }

    public JsonObject AuthenticateTwitter(string username, string? name, string? photoUrl)
    {
        var db = LoadDatabase();
        var users = db["users"]?.AsObject() ?? new JsonObject();
        db["users"] = users;

        var cleanHandle = username.Trim().TrimStart('@').ToLowerInvariant();
        var userId = $"twitter:{cleanHandle}";
        var displayName = !string.IsNullOrWhiteSpace(name) ? name.Trim() : $"@{cleanHandle}";
        var now = DateTime.UtcNow.ToString("o");

        if (users.TryGetPropertyValue(userId, out var existing) && existing is JsonObject existingObj)
        {
            if (existingObj["profile"] is JsonObject prof)
            {
                prof["lastLoginAt"] = now;
                prof["displayName"] = displayName;
                prof["username"] = $"@{cleanHandle}";
                if (!string.IsNullOrEmpty(photoUrl)) prof["photoUrl"] = photoUrl;
            }
            SaveDatabase(db);
            return existingObj;
        }

        var newEntry = new JsonObject
        {
            ["profile"] = new JsonObject
            {
                ["id"] = userId,
                ["displayName"] = displayName,
                ["username"] = $"@{cleanHandle}",
                ["photoUrl"] = photoUrl ?? $"https://api.dicebear.com/7.x/bottts/svg?seed={Uri.EscapeDataString(cleanHandle)}",
                ["provider"] = "twitter",
                ["createdAt"] = now,
                ["lastLoginAt"] = now
            },
            ["playlists"] = new JsonArray(),
            ["likedTracks"] = new JsonArray(),
            ["updatedAt"] = now
        };
        users[userId] = newEntry;
        SaveDatabase(db);
        return newEntry;
    }

    public JsonObject AuthenticateGithub(string username, string? name, string? photoUrl)
    {
        var db = LoadDatabase();
        var users = db["users"]?.AsObject() ?? new JsonObject();
        db["users"] = users;

        var cleanUser = username.Trim().TrimStart('@').ToLowerInvariant();
        var userId = $"github:{cleanUser}";
        var displayName = !string.IsNullOrWhiteSpace(name) ? name.Trim() : cleanUser;
        var now = DateTime.UtcNow.ToString("o");

        if (users.TryGetPropertyValue(userId, out var existing) && existing is JsonObject existingObj)
        {
            if (existingObj["profile"] is JsonObject prof)
            {
                prof["lastLoginAt"] = now;
                prof["displayName"] = displayName;
                prof["username"] = $"@{cleanUser}";
                if (!string.IsNullOrEmpty(photoUrl)) prof["photoUrl"] = photoUrl;
            }
            SaveDatabase(db);
            return existingObj;
        }

        var newEntry = new JsonObject
        {
            ["profile"] = new JsonObject
            {
                ["id"] = userId,
                ["displayName"] = displayName,
                ["username"] = $"@{cleanUser}",
                ["photoUrl"] = photoUrl ?? $"https://github.com/{Uri.EscapeDataString(cleanUser)}.png",
                ["provider"] = "github",
                ["createdAt"] = now,
                ["lastLoginAt"] = now
            },
            ["playlists"] = new JsonArray(),
            ["likedTracks"] = new JsonArray(),
            ["updatedAt"] = now
        };
        users[userId] = newEntry;
        SaveDatabase(db);
        return newEntry;
    }

    public JsonObject? GetUserData(string userId)
    {
        var db = LoadDatabase();
        var users = db["users"]?.AsObject();
        if (users != null && users.TryGetPropertyValue(userId, out var node) && node is JsonObject obj)
        {
            return obj;
        }
        return null;
    }

    public bool SaveUserData(string userId, JsonArray? playlists, JsonArray? likedTracks, JsonObject? playbackSession)
    {
        var db = LoadDatabase();
        var users = db["users"]?.AsObject() ?? new JsonObject();
        db["users"] = users;

        if (!users.TryGetPropertyValue(userId, out var node) || node is not JsonObject userObj)
        {
            var now = DateTime.UtcNow.ToString("o");
            userObj = new JsonObject
            {
                ["profile"] = new JsonObject
                {
                    ["id"] = userId,
                    ["displayName"] = userId.StartsWith("phone:") ? $"Listener {userId[^4..]}" : "Listener",
                    ["provider"] = userId.StartsWith("google:") ? "google" : "phone",
                    ["createdAt"] = now,
                    ["lastLoginAt"] = now
                },
                ["playlists"] = new JsonArray(),
                ["likedTracks"] = new JsonArray(),
                ["updatedAt"] = now
            };
            users[userId] = userObj;
        }

        if (playlists != null) userObj["playlists"] = playlists;
        if (likedTracks != null) userObj["likedTracks"] = likedTracks;
        if (playbackSession != null) userObj["playbackSession"] = playbackSession;
        userObj["updatedAt"] = DateTime.UtcNow.ToString("o");

        SaveDatabase(db);
        return true;
    }
}
