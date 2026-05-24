using Microsoft.AspNetCore.Mvc;
using SiteAnalyser.Api.Data;
using SiteAnalyser.Api.Models;
using SiteAnalyser.Api.Services;

namespace SiteAnalyser.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly IPageSpeedService _pageSpeed;
    private readonly AppDbContext _db;                      // NEW

    // supplies the service and a scoped DbContext automatically
    public AuditController(IPageSpeedService pageSpeed, AppDbContext db)
    {
        _pageSpeed = pageSpeed;
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult<AuditResult>> RunAudit([FromBody] AuditRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url) ||
            !Uri.TryCreate(request.Url, UriKind.Absolute, out _))
        {
            return BadRequest(new { error = "Invalid URL" });
        }

        try
        {
            var result = await _pageSpeed.RunAuditAsync(request.Url);

            // Persist this audit
            // Map the clean AuditResult into an Audit entity 
            // GetValueOrDefault returns 0 if a category is missing, so a partial
            // PageSpeed run still saves rather than throwing.
            var record = new Audit
            {
                Url = result.Url,
                Performance = result.Scores.GetValueOrDefault("performance"),
                Accessibility = result.Scores.GetValueOrDefault("accessibility"),
                BestPractices = result.Scores.GetValueOrDefault("best-practices"),
                Seo = result.Scores.GetValueOrDefault("seo"),
                Lcp = result.Vitals.GetValueOrDefault("largest-contentful-paint")?.DisplayValue,
                Cls = result.Vitals.GetValueOrDefault("cumulative-layout-shift")?.DisplayValue,
                Tbt = result.Vitals.GetValueOrDefault("total-blocking-time")?.DisplayValue,
                // CreatedAt defaults to DateTime.UtcNow in the entity, so we don't set it here.
            };

            _db.Audits.Add(record);          // stage the insert (in memory)
            await _db.SaveChangesAsync();    // commit to Postgres Supabase

            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { error = ex.Message });
        }
    }
}