using System.Text.Json;
using SiteAnalyser.Api.Models;

namespace SiteAnalyser.Api.Services;

public interface IPageSpeedService
{
    Task<AuditResult> RunAuditAsync(string url);
}

public class PageSpeedService : IPageSpeedService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    // ── CONSTRUCTOR INJECTION ──────────────────────────────────────────
    // The framework passes these arguments automatically because we register
    // HttpClient and IConfiguration in the DI container. 
    public PageSpeedService(HttpClient http, IConfiguration config)
    {
        _http = http;
        // Read the secret we stored earlier. The ?? throws if it's missing 
        _apiKey = config["PageSpeed:ApiKey"]
            ?? throw new InvalidOperationException("PageSpeed:ApiKey not configured");
    }

    public async Task<AuditResult> RunAuditAsync(string url)
    {
        // Build the request URL. 
        var endpoint =
            $"https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
            $"?url={Uri.EscapeDataString(url)}" +
            $"&key={_apiKey}" +
            $"&strategy=mobile" +
            $"&category=performance&category=accessibility" +
            $"&category=best-practices&category=seo";

        // HttpClient is the C# fetch(). GetAsync sends the GET request.
        var response = await _http.GetAsync(endpoint);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"PageSpeed API {(int)response.StatusCode}: {body}");
        }

        // Parse the JSON. JsonDocument lets us navigate without modelling the
        // huge PageSpeed response, we just take the bits we need.
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var lighthouse = doc.RootElement.GetProperty("lighthouseResult");
        var categories = lighthouse.GetProperty("categories");
        var audits = lighthouse.GetProperty("audits");

        // Pull the four category scores into a dictionary.
        var scores = new Dictionary<string, double>();
        foreach (var key in new[] { "performance", "accessibility", "best-practices", "seo" })
        {
            if (categories.TryGetProperty(key, out var cat) &&
                cat.TryGetProperty("score", out var score) &&
                score.ValueKind != JsonValueKind.Null)
            {
                scores[key] = score.GetDouble();
            }
        }

        // Pull the Core Web Vitals 
        var vitalKeys = new[]
        {
            "largest-contentful-paint", "cumulative-layout-shift",
            "total-blocking-time", "first-contentful-paint", "speed-index"
        };
        var vitals = new Dictionary<string, VitalMetric>();
        foreach (var key in vitalKeys)
        {
            if (audits.TryGetProperty(key, out var audit))
            {
                var display = audit.TryGetProperty("displayValue", out var dv)
                    ? dv.GetString() ?? "" : "";
                double? vScore = audit.TryGetProperty("score", out var sc)
                    && sc.ValueKind == JsonValueKind.Number ? sc.GetDouble() : null;
                vitals[key] = new VitalMetric(display, vScore);
            }
        }

        return new AuditResult(url, scores, vitals, DateTime.UtcNow);
    }
}