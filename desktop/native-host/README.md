# Native Messaging Host (Windows)

This enables the browser extension to send commands to the WPF app.

## Build host
```bash
cd desktop/WepMacroHost
dotnet publish -c Release -r win-x64 --self-contained false
```

Copy the output exe to `C:\WepMacro\WepMacroHost.exe` and the `host.json` to `C:\WepMacro\host.json`.

## Register host
- Edit `host.json` and replace `REPLACE_WITH_EXTENSION_ID` with your extension ID.
- Double-click `install.reg` to register the native host.

## Notes
- The WPF app must be running to receive commands.
