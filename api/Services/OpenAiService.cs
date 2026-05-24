using System.Runtime.CompilerServices;
using OpenAI.Chat;
using SiteAnalyser.Api.Models;

namespace SiteAnalyser.Api.Services;

// Contract: produce the summary as an async stream of text fragments.
// IAsyncEnumerable<string> is C#'s "stream of strings arriving over time" —
// the closest equivalent to the async iterable OpenAI's JS SDK gave you.
public interface IOpenAiService
{
    IAsyncEnumerable<string> StreamSummaryAsync(
        Dictionary<string, double> scores,
        Dictionary<string, VitalMetric> vitals,
        CancellationToken cancellationToken);
}

public class OpenAiService : IOpenAiService
{
    private readonly ChatClient _chat;

    public OpenAiService(IConfiguration config)
    {
        var apiKey = config["OpenAi:ApiKey"]
            ?? throw new InvalidOperationException("OpenAi:ApiKey not configured");
        // ChatClient is the OpenAI .NET SDK's per-model client. Model name as the
        // first arg. (If your account/SDK version rejects this exact name, swap it —
        // the SDK throws a clear error naming the bad model.)
        _chat = new ChatClient("gpt-5.4-mini", apiKey);
    }

    // 'async IAsyncEnumerable<string>' + 'yield return' is how you author a stream
    // in C#. Each yield hands one fragment to the caller, then pauses until they
    // ask for the next — exactly the producer side of your JS reader loop.
    public async IAsyncEnumerable<string> StreamSummaryAsync(
        Dictionary<string, double> scores,
        Dictionary<string, VitalMetric> vitals,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var systemPrompt =
            "You are a senior web consultant. You are given Lighthouse audit scores, " +
            "the site's Core Web Vitals, and you must write a short, plain-English summary " +
            "(under 250 words) covering: 1) an overall verdict in one sentence, 2) the 3 " +
            "highest-impact fixes with brief reasoning, 3) one thing the site does well, and " +
            "4) a specific comment on the Core Web Vitals (LCP, CLS, TBT), noting which are in " +
            "good range and which need work. No jargon. Write like you are explaining it to the " +
            "business owner over coffee.";

        var userPrompt =
            $"Scores: {System.Text.Json.JsonSerializer.Serialize(scores)}\n\n" +
            $"Core Web Vitals: {System.Text.Json.JsonSerializer.Serialize(vitals)}";

        var messages = new ChatMessage[]
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(userPrompt),
        };

        // CompleteChatStreamingAsync returns an async stream of update objects.
        // Each update may carry zero or more text pieces in ContentUpdate.
        var updates = _chat.CompleteChatStreamingAsync(
            messages,
            cancellationToken: cancellationToken);

        await foreach (var update in updates.WithCancellation(cancellationToken))
        {
            foreach (var part in update.ContentUpdate)
            {
                if (!string.IsNullOrEmpty(part.Text))
                {
                    yield return part.Text;
                }
            }
        }
    }
}