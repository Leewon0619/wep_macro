using System.Diagnostics;
using System.Runtime.InteropServices;
using WepMacroApp.Models;

namespace WepMacroApp.Services;

public sealed class HookService : IDisposable
{
    private nint _keyboardHook;
    private nint _mouseHook;
    private WinApi.HookProc? _keyboardProc;
    private WinApi.HookProc? _mouseProc;

    public event Action<MacroEvent>? OnMacroEvent;
    public event Action<string>? OnLog;

    public void Start()
    {
        if (_keyboardHook != nint.Zero || _mouseHook != nint.Zero) return;

        _keyboardProc = KeyboardHookCallback;
        _mouseProc = MouseHookCallback;

        using var current = Process.GetCurrentProcess();
        using var module = current.MainModule;
        var hModule = WinApi.GetModuleHandle(module?.ModuleName);

        _keyboardHook = WinApi.SetWindowsHookEx(WinApi.WH_KEYBOARD_LL, _keyboardProc, hModule, 0);
        _mouseHook = WinApi.SetWindowsHookEx(WinApi.WH_MOUSE_LL, _mouseProc, hModule, 0);
    }

    public void Stop()
    {
        if (_keyboardHook != nint.Zero)
        {
            WinApi.UnhookWindowsHookEx(_keyboardHook);
            _keyboardHook = nint.Zero;
        }
        if (_mouseHook != nint.Zero)
        {
            WinApi.UnhookWindowsHookEx(_mouseHook);
            _mouseHook = nint.Zero;
        }
    }

    private nint KeyboardHookCallback(int nCode, nint wParam, nint lParam)
    {
        if (nCode >= 0)
        {
            var msg = wParam.ToInt32();
            if (msg is WinApi.WM_KEYDOWN or WinApi.WM_KEYUP or WinApi.WM_SYSKEYDOWN or WinApi.WM_SYSKEYUP)
            {
                var data = Marshal.PtrToStructure<WinApi.KBDLLHOOKSTRUCT>(lParam);
                var isDown = msg is WinApi.WM_KEYDOWN or WinApi.WM_SYSKEYDOWN;
                var evt = new MacroEvent
                {
                    Type = isDown ? MacroEventType.KeyDown : MacroEventType.KeyUp,
                    VirtualKey = (int)data.vkCode,
                    ScanCode = (int)data.scanCode,
                    IsExtended = (data.flags & 0x01) != 0,
                };
                OnMacroEvent?.Invoke(evt);
                OnLog?.Invoke($"Key {(isDown ? "Down" : "Up")} VK={evt.VirtualKey} Scan={evt.ScanCode}");
            }
        }

        return WinApi.CallNextHookEx(_keyboardHook, nCode, wParam, lParam);
    }

    private nint MouseHookCallback(int nCode, nint wParam, nint lParam)
    {
        if (nCode >= 0)
        {
            var msg = wParam.ToInt32();
            var data = Marshal.PtrToStructure<WinApi.MSLLHOOKSTRUCT>(lParam);
            var evt = new MacroEvent
            {
                X = data.pt.X,
                Y = data.pt.Y,
            };

            switch (msg)
            {
                case WinApi.WM_LBUTTONDOWN:
                    evt.Type = MacroEventType.MouseDown;
                    evt.MouseButton = 0;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Down ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_LBUTTONUP:
                    evt.Type = MacroEventType.MouseUp;
                    evt.MouseButton = 0;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Up ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_RBUTTONDOWN:
                    evt.Type = MacroEventType.MouseDown;
                    evt.MouseButton = 1;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Down R ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_RBUTTONUP:
                    evt.Type = MacroEventType.MouseUp;
                    evt.MouseButton = 1;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Up R ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_MBUTTONDOWN:
                    evt.Type = MacroEventType.MouseDown;
                    evt.MouseButton = 2;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Down M ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_MBUTTONUP:
                    evt.Type = MacroEventType.MouseUp;
                    evt.MouseButton = 2;
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Mouse Up M ({evt.X},{evt.Y})");
                    break;
                case WinApi.WM_MOUSEMOVE:
                    evt.Type = MacroEventType.MouseMove;
                    OnMacroEvent?.Invoke(evt);
                    break;
                case WinApi.WM_MOUSEWHEEL:
                    evt.Type = MacroEventType.Wheel;
                    evt.DeltaY = (short)((data.mouseData >> 16) & 0xffff);
                    OnMacroEvent?.Invoke(evt);
                    OnLog?.Invoke($"Wheel ({evt.X},{evt.Y}) dy={evt.DeltaY}");
                    break;
            }
        }

        return WinApi.CallNextHookEx(_mouseHook, nCode, wParam, lParam);
    }

    public void Dispose()
    {
        Stop();
    }
}
