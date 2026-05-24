using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SiteAnalyser.Api.Data;
using SiteAnalyser.Api.Models;

namespace SiteAnalyser.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HistoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public HistoryController(AppDbContext db) => _db = db;

    // GET api/history?url=https://example.com
    [HttpGet]
    public async Task<ActionResult<List<Audit>>> GetHistory([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(new { error = "url query parameter required" });

        var history = await _db.Audits
            .Where(a => a.Url == url)              // filter to this URL
            .OrderByDescending(a => a.CreatedAt)   // newest first
            .Take(20)                              // cap at 20 rows
            .ToListAsync();                        // execute the query

        return Ok(history);
    }
}