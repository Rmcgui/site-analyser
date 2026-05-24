using SiteAnalyser.Api.Services;
using Microsoft.EntityFrameworkCore;  
using SiteAnalyser.Api.Data;           

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddHttpClient<IPageSpeedService, PageSpeedService>();

// CORS policy to allow requests from the React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:3000", "https://audit.webdesignbyryan.com") // react dev server
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddSingleton<IOpenAiService, OpenAiService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors("AllowFrontend");

app.MapControllers();

app.Run();
