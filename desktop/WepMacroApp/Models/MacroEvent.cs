namespace WepMacroApp.Models;

public sealed class MacroEvent
{
    public MacroEventType Type { get; set; }
    public long TimestampMs { get; set; }

    public int X { get; set; }
    public int Y { get; set; }
    public int MouseButton { get; set; }
    public int DeltaX { get; set; }
    public int DeltaY { get; set; }

    public int VirtualKey { get; set; }
    public int ScanCode { get; set; }
    public bool IsExtended { get; set; }
}
