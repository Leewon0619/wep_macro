# Wep Macro Desktop (Windows)

This is a WPF desktop app that enables global keyboard/mouse recording and playback on Windows.

## Requirements
- Windows 10/11
- .NET 8 SDK (or newer)

## Build & Run
```bash
cd desktop/WepMacroApp
dotnet restore
dotnet run
```

## Notes
- Global hooks require the app to stay running.
- Playback uses `SendInput`, so admin privileges may be required for some target apps.
