using System.Diagnostics;
using WepMacroApp.Models;

namespace WepMacroApp.Services;

public sealed class PlaybackService
{
    private readonly CancellationTokenSource _cts = new();

    public async Task RunAsync(Macro macro, int repeatCount, Action<string>? log, CancellationToken externalToken)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(_cts.Token, externalToken);
        var token = linked.Token;
        var events = macro.Events;
        if (events.Count == 0) return;

        var repeat = repeatCount < 0 ? 1 : repeatCount;
        var infinite = repeatCount == 0;

        int iteration = 0;
        while (!token.IsCancellationRequested && (infinite || iteration < repeat))
        {
            iteration++;
            var sw = Stopwatch.StartNew();
            foreach (var evt in events)
            {
                var delay = evt.TimestampMs - sw.ElapsedMilliseconds;
                if (delay > 0)
                {
                    await Task.Delay((int)delay, token);
                }
                SendEvent(evt);
            }
            log?.Invoke($"Run iteration {iteration} complete");
        }
    }

    public void Stop()
    {
        _cts.Cancel();
    }

    private static void SendEvent(MacroEvent evt)
    {
        if (evt.Type == MacroEventType.KeyDown || evt.Type == MacroEventType.KeyUp)
        {
            var flags = WinApi.KEYEVENTF_SCANCODE;
            if (evt.IsExtended) flags |= WinApi.KEYEVENTF_EXTENDEDKEY;
            if (evt.Type == MacroEventType.KeyUp) flags |= WinApi.KEYEVENTF_KEYUP;

            var input = new WinApi.INPUT
            {
                type = WinApi.INPUT_KEYBOARD,
                U = new WinApi.InputUnion
                {
                    ki = new WinApi.KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = (ushort)evt.ScanCode,
                        dwFlags = flags,
                        time = 0,
                        dwExtraInfo = 0
                    }
                }
            };
            WinApi.SendInput(1, new[] { input }, MarshalSize());
            return;
        }

        if (evt.Type == MacroEventType.MouseMove)
        {
            SendMouseMove(evt.X, evt.Y);
            return;
        }

        if (evt.Type == MacroEventType.Wheel)
        {
            var input = new WinApi.INPUT
            {
                type = WinApi.INPUT_MOUSE,
                U = new WinApi.InputUnion
                {
                    mi = new WinApi.MOUSEINPUT
                    {
                        dx = 0,
                        dy = 0,
                        mouseData = (uint)evt.DeltaY,
                        dwFlags = WinApi.MOUSEEVENTF_WHEEL,
                        time = 0,
                        dwExtraInfo = 0
                    }
                }
            };
            WinApi.SendInput(1, new[] { input }, MarshalSize());
            return;
        }

        if (evt.Type == MacroEventType.MouseDown || evt.Type == MacroEventType.MouseUp)
        {
            SendMouseMove(evt.X, evt.Y);
            var flags = evt.MouseButton switch
            {
                1 => evt.Type == MacroEventType.MouseDown ? WinApi.MOUSEEVENTF_RIGHTDOWN : WinApi.MOUSEEVENTF_RIGHTUP,
                2 => evt.Type == MacroEventType.MouseDown ? WinApi.MOUSEEVENTF_MIDDLEDOWN : WinApi.MOUSEEVENTF_MIDDLEUP,
                _ => evt.Type == MacroEventType.MouseDown ? WinApi.MOUSEEVENTF_LEFTDOWN : WinApi.MOUSEEVENTF_LEFTUP,
            };

            var input = new WinApi.INPUT
            {
                type = WinApi.INPUT_MOUSE,
                U = new WinApi.InputUnion
                {
                    mi = new WinApi.MOUSEINPUT
                    {
                        dx = 0,
                        dy = 0,
                        mouseData = 0,
                        dwFlags = flags,
                        time = 0,
                        dwExtraInfo = 0
                    }
                }
            };
            WinApi.SendInput(1, new[] { input }, MarshalSize());
        }
    }

    private static void SendMouseMove(int x, int y)
    {
        var screenWidth = WinApi.GetSystemMetrics(WinApi.SM_CXSCREEN);
        var screenHeight = WinApi.GetSystemMetrics(WinApi.SM_CYSCREEN);
        if (screenWidth <= 0 || screenHeight <= 0) return;

        var absoluteX = (int)(x * 65535.0 / (screenWidth - 1));
        var absoluteY = (int)(y * 65535.0 / (screenHeight - 1));

        var input = new WinApi.INPUT
        {
            type = WinApi.INPUT_MOUSE,
            U = new WinApi.InputUnion
            {
                mi = new WinApi.MOUSEINPUT
                {
                    dx = absoluteX,
                    dy = absoluteY,
                    mouseData = 0,
                    dwFlags = WinApi.MOUSEEVENTF_MOVE | WinApi.MOUSEEVENTF_ABSOLUTE,
                    time = 0,
                    dwExtraInfo = 0
                }
            }
        };

        WinApi.SendInput(1, new[] { input }, MarshalSize());
    }

    private static int MarshalSize()
    {
        return System.Runtime.InteropServices.Marshal.SizeOf<WinApi.INPUT>();
    }
}
