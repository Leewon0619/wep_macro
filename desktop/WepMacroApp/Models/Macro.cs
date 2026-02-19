namespace WepMacroApp.Models;

public sealed class Macro
{
    public string Name { get; set; } = "Macro 1";
    public List<MacroEvent> Events { get; set; } = new();
}
