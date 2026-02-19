using System.IO.Pipes;
using System.Text;
using System.Text.Json;

const string PipeName = "wep_macro_pipe";

while (true)
{
    var message = ReadMessage(Console.OpenStandardInput());
    if (message == null) break;

    try
    {
        using var client = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
        client.Connect(1000);
        var bytes = Encoding.UTF8.GetBytes(message);
        client.Write(bytes, 0, bytes.Length);
        client.Flush();
    }
    catch
    {
    }

    WriteMessage(Console.OpenStandardOutput(), JsonSerializer.Serialize(new { ok = true }));
}

static string? ReadMessage(Stream input)
{
    Span<byte> lengthBytes = stackalloc byte[4];
    var read = input.Read(lengthBytes);
    if (read == 0) return null;
    while (read < 4)
    {
        var r = input.Read(lengthBytes.Slice(read));
        if (r == 0) return null;
        read += r;
    }

    var length = BitConverter.ToInt32(lengthBytes);
    if (length <= 0) return null;

    var buffer = new byte[length];
    var offset = 0;
    while (offset < length)
    {
        var r = input.Read(buffer, offset, length - offset);
        if (r == 0) break;
        offset += r;
    }
    return Encoding.UTF8.GetString(buffer, 0, offset);
}

static void WriteMessage(Stream output, string json)
{
    var bytes = Encoding.UTF8.GetBytes(json);
    var length = BitConverter.GetBytes(bytes.Length);
    output.Write(length, 0, length.Length);
    output.Write(bytes, 0, bytes.Length);
    output.Flush();
}
