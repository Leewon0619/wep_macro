using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Microsoft.Win32;
using WepMacroApp.Models;
using WepMacroApp.Services;

namespace WepMacroApp;

public partial class MainWindow : Window
{
    private readonly ObservableCollection<Macro> _macros = new();
    private readonly HookService _hookService = new();
    private readonly PlaybackService _playbackService = new();
    private readonly StorageService _storage = new();
    private readonly DispatcherTimer _runTimer = new();
    private readonly DispatcherTimer _coordTimer = new();
    private readonly Stopwatch _recordWatch = new();
    private readonly List<string> _logBuffer = new();

    private bool _recording;
    private bool _running;
    private bool _runEnabled = true;
    private bool _editMode;
    private bool _coordMode;
    private bool _logMode;
    private CancellationTokenSource? _runCts;

    public MainWindow()
    {
        InitializeComponent();

        _macros.Add(new Macro { Name = "Macro 1" });
        MacroList.ItemsSource = _macros;
        MacroList.SelectedIndex = 0;

        ManualActionBox.SelectedIndex = 0;

        _hookService.OnMacroEvent += HookService_OnMacroEvent;
        _hookService.OnLog += HookService_OnLog;
        _hookService.Start();

        _runTimer.Interval = TimeSpan.FromMilliseconds(50);
        _runTimer.Tick += (_, _) => UpdateRunTime();

        _coordTimer.Interval = TimeSpan.FromMilliseconds(50);
        _coordTimer.Tick += (_, _) => UpdateCoordPosition();

        UpdateUI();
    }

    private Macro? CurrentMacro => MacroList.SelectedItem as Macro;

    private void HookService_OnMacroEvent(MacroEvent evt)
    {
        Dispatcher.Invoke(() =>
        {
            if (_recording && !_running)
            {
                evt.TimestampMs = _recordWatch.ElapsedMilliseconds;
                CurrentMacro?.Events.Add(evt);
                EventCountText.Text = $"Events: {CurrentMacro?.Events.Count ?? 0}";
            }
        });
    }

    private void HookService_OnLog(string message)
    {
        if (!_logMode) return;
        Dispatcher.Invoke(() =>
        {
            var stamp = DateTime.Now.ToString("HH:mm:ss.fff");
            _logBuffer.Add($"[{stamp}] {message}");
            if (_logBuffer.Count > 400)
            {
                _logBuffer.RemoveRange(0, _logBuffer.Count - 400);
            }
            LogOutput.Text = string.Join(Environment.NewLine, _logBuffer);
            LogOutput.ScrollToEnd();
        });
    }

    private void UpdateRunTime()
    {
        if (!_running)
        {
            RunTimeText.Text = "Run Time: 00:00.000";
            return;
        }

        if (_runCts == null) return;
        var elapsed = _runStopwatch.Elapsed;
        RunTimeText.Text = $"Run Time: {elapsed:mm\:ss\.fff}";
    }

    private readonly Stopwatch _runStopwatch = new();

    private void UpdateCoordPosition()
    {
        if (!_coordMode) return;
        if (WinApi.GetCursorPos(out var pt))
        {
            CoordXBox.Text = pt.X.ToString();
            CoordYBox.Text = pt.Y.ToString();
        }
    }

    private void UpdateUI()
    {
        RecordStateText.Text = _recording ? "Recording" : "Idle";
        EventCountText.Text = $"Events: {CurrentMacro?.Events.Count ?? 0}";
        OnOffButton.Content = _runEnabled ? "On" : "Off / Edit";
        RunButton.Content = _running ? "Stop" : "Run";
        EditButton.Content = _editMode ? "Edit (On)" : "Edit";
        CoordModeText.Text = _coordMode ? "On" : "Off";
        LogModeText.Text = _logMode ? "On" : "Off";
    }

    private void Record_Click(object sender, RoutedEventArgs e)
    {
        if (_recording)
        {
            _recording = false;
            _recordWatch.Stop();
            StatusText.Text = "Recording stopped";
        }
        else
        {
            if (CurrentMacro == null) return;
            CurrentMacro.Events.Clear();
            _recording = true;
            _recordWatch.Restart();
            StatusText.Text = "Recording...";
        }
        UpdateUI();
    }

    private async void Run_Click(object sender, RoutedEventArgs e)
    {
        if (_running)
        {
            StopRun();
            return;
        }

        if (!_runEnabled)
        {
            StatusText.Text = "Run disabled";
            return;
        }
        if (_editMode)
        {
            StatusText.Text = "Edit mode enabled";
            return;
        }
        if (CurrentMacro == null || CurrentMacro.Events.Count == 0)
        {
            StatusText.Text = "No events to run";
            return;
        }

        if (!int.TryParse(RepeatCountBox.Text, out var repeatCount)) repeatCount = 1;
        repeatCount = Math.Max(0, repeatCount);

        _running = true;
        _runCts = new CancellationTokenSource();
        _runStopwatch.Restart();
        _runTimer.Start();
        UpdateUI();

        try
        {
            await _playbackService.RunAsync(CurrentMacro, repeatCount, msg => StatusText.Text = msg, _runCts.Token);
        }
        catch (TaskCanceledException)
        {
        }
        finally
        {
            StopRun();
        }
    }

    private void StopRun()
    {
        _runCts?.Cancel();
        _running = false;
        _runTimer.Stop();
        _runStopwatch.Reset();
        UpdateRunTime();
        UpdateUI();
    }

    private void AddMacro_Click(object sender, RoutedEventArgs e)
    {
        _macros.Add(new Macro { Name = $"Macro {_macros.Count + 1}" });
        MacroList.SelectedIndex = _macros.Count - 1;
        UpdateUI();
    }

    private void DeleteMacro_Click(object sender, RoutedEventArgs e)
    {
        var macro = CurrentMacro;
        if (macro == null) return;
        _macros.Remove(macro);
        if (_macros.Count > 0) MacroList.SelectedIndex = 0;
        UpdateUI();
    }

    private void MacroList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        UpdateUI();
    }

    private void Edit_Click(object sender, RoutedEventArgs e)
    {
        _editMode = !_editMode;
        if (_editMode) _runEnabled = false;
        UpdateUI();
    }

    private void OnOff_Click(object sender, RoutedEventArgs e)
    {
        _runEnabled = !_runEnabled;
        if (!_runEnabled) _editMode = true;
        if (_runEnabled) _editMode = false;
        UpdateUI();
    }

    private void CoordMode_Click(object sender, RoutedEventArgs e)
    {
        _coordMode = !_coordMode;
        if (_coordMode)
        {
            _coordTimer.Start();
            StatusText.Text = "Coord mode on";
        }
        else
        {
            _coordTimer.Stop();
            StatusText.Text = "Coord mode off";
        }
        UpdateUI();
    }

    private void LogMode_Click(object sender, RoutedEventArgs e)
    {
        _logMode = !_logMode;
        StatusText.Text = _logMode ? "Log mode on" : "Log mode off";
        UpdateUI();
    }

    private void ClearLog_Click(object sender, RoutedEventArgs e)
    {
        _logBuffer.Clear();
        LogOutput.Text = "";
    }

    private void AddEvent_Click(object sender, RoutedEventArgs e)
    {
        var macro = CurrentMacro;
        if (macro == null) return;

        var x = _coordMode && int.TryParse(CoordXBox.Text, out var cx) ? cx : int.TryParse(ManualXBox.Text, out var mx) ? mx : 0;
        var y = _coordMode && int.TryParse(CoordYBox.Text, out var cy) ? cy : int.TryParse(ManualYBox.Text, out var my) ? my : 0;

        var actionItem = ManualActionBox.SelectedItem as ComboBoxItem;
        var action = actionItem?.Tag?.ToString() ?? "Click";

        var lastTs = macro.Events.Count > 0 ? macro.Events[^1].TimestampMs : 0;
        var baseTs = lastTs + 50;

        if (action == "Click")
        {
            macro.Events.Add(new MacroEvent { Type = MacroEventType.MouseDown, X = x, Y = y, MouseButton = 0, TimestampMs = baseTs });
            macro.Events.Add(new MacroEvent { Type = MacroEventType.MouseUp, X = x, Y = y, MouseButton = 0, TimestampMs = baseTs + 20 });
        }
        else if (action == "MouseDown")
        {
            macro.Events.Add(new MacroEvent { Type = MacroEventType.MouseDown, X = x, Y = y, MouseButton = 0, TimestampMs = baseTs });
        }
        else if (action == "MouseUp")
        {
            macro.Events.Add(new MacroEvent { Type = MacroEventType.MouseUp, X = x, Y = y, MouseButton = 0, TimestampMs = baseTs });
        }

        EventCountText.Text = $"Events: {macro.Events.Count}";
    }

    private void SaveMacro_Click(object sender, RoutedEventArgs e)
    {
        var macro = CurrentMacro;
        if (macro == null) return;
        var dialog = new SaveFileDialog { Filter = "Macro (*.m)|*.m", FileName = macro.Name + ".m" };
        if (dialog.ShowDialog() == true)
        {
            _storage.SaveMacro(dialog.FileName, macro);
            StatusText.Text = "Macro saved";
        }
    }

    private void LoadMacro_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Filter = "Macro (*.m)|*.m" };
        if (dialog.ShowDialog() == true)
        {
            var macro = _storage.LoadMacro(dialog.FileName);
            _macros.Add(macro);
            MacroList.SelectedItem = macro;
            StatusText.Text = "Macro loaded";
        }
    }

    private void SaveIni_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog { Filter = "INI (*.ini)|*.ini", FileName = "wep_macro.ini" };
        if (dialog.ShowDialog() == true)
        {
            var settings = new AppSettings
            {
                RepeatCount = int.TryParse(RepeatCountBox.Text, out var repeat) ? repeat : 1,
                CoordMode = _coordMode,
                LogMode = _logMode
            };
            _storage.SaveIni(dialog.FileName, settings);
            StatusText.Text = "INI saved";
        }
    }

    private void LoadIni_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Filter = "INI (*.ini)|*.ini" };
        if (dialog.ShowDialog() == true)
        {
            var settings = _storage.LoadIni(dialog.FileName);
            RepeatCountBox.Text = settings.RepeatCount.ToString();
            _coordMode = settings.CoordMode;
            _logMode = settings.LogMode;
            if (_coordMode) _coordTimer.Start(); else _coordTimer.Stop();
            UpdateUI();
            StatusText.Text = "INI loaded";
        }
    }

    private void RepeatCount_LostFocus(object sender, RoutedEventArgs e)
    {
        if (!int.TryParse(RepeatCountBox.Text, out var repeat))
        {
            RepeatCountBox.Text = "1";
        }
        else if (repeat < 0)
        {
            RepeatCountBox.Text = "0";
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        _hookService.Dispose();
        _runCts?.Cancel();
        base.OnClosed(e);
    }
}
