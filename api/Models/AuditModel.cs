namespace SiteAnalyser.Api.Models;

// Use a record - is a lightweight immutable data type — perfect for DTOs (Data Transfer
// Objects)
// The shape WE return to the frontend (clean, just what the UI needs):
public record AuditResult(
    string Url,
    Dictionary<string, double> Scores,           // e.g. {"performance": 0.96}
    Dictionary<string, VitalMetric> Vitals,       // LCP/CLS/etc with display values
    DateTime CreatedAt
);

public record VitalMetric(string DisplayValue, double? Score);

// The request body the frontend POSTs:
public record AuditRequest(string Url);