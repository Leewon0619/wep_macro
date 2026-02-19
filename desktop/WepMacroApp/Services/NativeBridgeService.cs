using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace WepMacroApp.Services;

public sealed class NativeBridgeService : IDisposable
{
    private const string PipeName = "wep_macro_pipe";
    private CancellationTokenSource? _cts;
    private Task? _listenerTask;

    public event Action<BridgeMessage>? OnMessage;

    public void Start()
    {
        if (_listenerTask != null) return;
        _cts = new CancellationTokenSource();
        _listenerTask = Task.Run(() => ListenAsync(_cts.Token));
    }

    private async Task ListenAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            using var server = new NamedPipeServerStream(PipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
            await server.WaitForConnectionAsync(token);

            using var ms = new MemoryStream();
            var buffer = new byte[4096];
            int read;
            while ((read = await server.ReadAsync(buffer, token)) > 0)
            {
                ms.Write(buffer, 0, read);
            }
            var json = Encoding.UTF8.GetString(ms.ToArray());
            if (string.IsNullOrWhiteSpace(json)) continue;

            try
            {
                var message = JsonSerializer.Deserialize<BridgeMessage>(json);
                if (message != null)
                {
                    OnMessage?.Invoke(message);
                }
            }
            catch
            {
            }
        }
    }

    public void Stop()
    {
        _cts?.Cancel();
        _listenerTask = null;
    }

    public void Dispose()
    {
        Stop();
    }
}

public sealed class BridgeMessage
{
    public string Type { get; set; } = "";
    public int Repeat { get; set; } = 1;
    public WepMacroApp.Models.Macro? Macro { get; set; }
    public bool Value { get; set; }
}
