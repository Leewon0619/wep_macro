using System.Text.Json;
using WepMacroApp.Models;

namespace WepMacroApp.Services;

public sealed class StorageService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
    };

    public void SaveMacro(string path, Macro macro)
    {
        var payload = new { version = 1, macro };
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        File.WriteAllText(path, json);
    }

    public Macro LoadMacro(string path)
    {
        var json = File.ReadAllText(path);
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("macro", out var macroElement))
        {
            throw new InvalidDataException("Invalid macro file");
        }
        var macro = macroElement.Deserialize<Macro>() ?? new Macro();
        return macro;
    }

    public void SaveIni(string path, AppSettings settings)
    {
        var lines = new List<string>
        {
            "[settings]",
            $"repeatCount={settings.RepeatCount}",
            $"coordMode={settings.CoordMode}",
            $"logMode={settings.LogMode}",
        };
        File.WriteAllText(path, string.Join(Environment.NewLine, lines));
    }

    public AppSettings LoadIni(string path)
    {
        var settings = new AppSettings();
        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith(";")) continue;
            if (line.StartsWith("[")) continue;
            var parts = line.Split('=', 2);
            if (parts.Length != 2) continue;
            var key = parts[0].Trim();
            var value = parts[1].Trim();
            if (key.Equals("repeatCount", StringComparison.OrdinalIgnoreCase))
            {
                if (int.TryParse(value, out var repeat)) settings.RepeatCount = Math.Max(0, repeat);
            }
            else if (key.Equals("coordMode", StringComparison.OrdinalIgnoreCase))
            {
                settings.CoordMode = value.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
            else if (key.Equals("logMode", StringComparison.OrdinalIgnoreCase))
            {
                settings.LogMode = value.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
        }

        return settings;
    }
}

public sealed class AppSettings
{
    public int RepeatCount { get; set; } = 1;
    public bool CoordMode { get; set; }
    public bool LogMode { get; set; }
}
