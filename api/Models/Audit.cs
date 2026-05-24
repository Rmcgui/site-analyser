namespace SiteAnalyser.Api.Models;

public class Audit
{
    public int Id { get; set; }                  // primary key 
    public string Url { get; set; } = "";
    public double Performance { get; set; }
    public double Accessibility { get; set; }
    public double BestPractices { get; set; }
    public double Seo { get; set; }
    public string? Lcp { get; set; }             // vitals stored as their display strings ("1.2 s")
    public string? Cls { get; set; }
    public string? Tbt { get; set; }
    public string? Summary { get; set; }         // the AI summary text (nullable — may not be saved)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}