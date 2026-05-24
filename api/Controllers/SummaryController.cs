using System.Text;
using Microsoft.AspNetCore.Mvc;
using SiteAnalyser.Api.Models;
using SiteAnalyser.Api.Services;

namespace SiteAnalyser.Api.Controllers;

// Request body the frontend POSTs: the scores + vitals it already has.
public record SummaryRequest(
    Dictionary<string, double> Scores,
    Dictionary<string, VitalMetric> Vitals);

[ApiController]
[Route("api/[controller]")]
public class SummaryController : ControllerBase
{
    private readonly IOpenAiService _openAi;

    public SummaryController(IOpenAiService openAi) => _openAi = openAi;

    // POST api/summary
    // We DON'T return ActionResult here. Returning IAsyncEnumerable or a normal
    // result lets the framework buffer the whole thing 
    // Instead we write to Response.Body directly and flush after
    // each token, forcing each fragment out immediately
    [HttpPost]
    public async Task StreamSummary([FromBody] SummaryRequest request)
    {
        // Tell the client this is a plain-text stream (matches the frontend's
        // TextDecoder reader loop, which expects raw text, not JSON).
        Response.ContentType = "text/plain; charset=utf-8";

        var token = HttpContext.RequestAborted; // cancels if the client disconnects

        await foreach (var fragment in
            _openAi.StreamSummaryAsync(request.Scores, request.Vitals, token))
        {
            var bytes = Encoding.UTF8.GetBytes(fragment);
            await Response.Body.WriteAsync(bytes, token);
            await Response.Body.FlushAsync(token); 
        }
    }
}