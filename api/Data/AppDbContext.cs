using Microsoft.EntityFrameworkCore;
using SiteAnalyser.Api.Models;

namespace SiteAnalyser.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Audit> Audits => Set<Audit>();   // this DbSet becomes the "Audits" table
}