# SiteAnalyser

A full-stack website audit tool. Paste a URL, get real Google Lighthouse scores
(performance, accessibility, best practices, SEO) plus Core Web Vitals, and a
plain-English summary of what to fix — streamed live from an AI model.

Built as a **React + ASP.NET Core** application: a Next.js front end talking to a
C# REST API that integrates the Google PageSpeed Insights and OpenAI APIs, with
audit history persisted to Postgres via Entity Framework Core.

> **Status:** Core audit and AI-summary pipeline complete and working end to end.
> Historical tracking (EF Core + Postgres) and deployment in progress.

---

## Architecture

```
┌──────────────────┐      JSON over HTTP      ┌────────────────────────────┐
│  React frontend  │ ───────────────────────▶ │   ASP.NET Core Web API     │
│  (Next.js, TS)   │ ◀─────────────────────── │   (C# / .NET 10)           │
│  localhost:3000  │                          │   localhost:5188           │
└──────────────────┘                          │                            │
                                              │  Controllers               │
                                              │   • AuditController         │
                                              │   • SummaryController       │
                                              │  Services (DI)              │
                                              │   • PageSpeedService        │
                                              │   • OpenAiService           │
                                              └──────┬──────────────┬───────┘
                                                     │              │
                                          ┌──────────▼───┐   ┌──────▼───────┐
                                          │ Google       │   │ OpenAI       │
                                          │ PageSpeed    │   │ (streaming)  │
                                          └──────────────┘   └──────────────┘
```

The front end and API are two independent processes that share nothing but a
JSON-over-HTTP contract — they can be developed, deployed, and scaled separately.

---

## Tech stack

**Frontend** — React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui (Base UI)
**Backend** — C# / .NET 10, ASP.NET Core Web API, dependency-injected services
**Integrations** — Google PageSpeed Insights API, OpenAI API (streaming chat completions)
**Persistence** *(in progress)* — Entity Framework Core 10, PostgreSQL (Supabase)
**Tooling** — npm, NuGet, dotnet user-secrets for local configuration

---

## How it works

1. The user submits a URL in the React UI. The frontend POSTs it to the .NET API
   at `/api/audit`.
2. `AuditController` validates the URL and delegates to `PageSpeedService`, which
   calls Google PageSpeed Insights via `HttpClient`, then shapes the large raw
   response down to just the scores and Core Web Vitals the UI needs.
3. The clean result is returned as JSON and rendered as score cards and a vitals row.
4. Once results render, the frontend makes a second request to `/api/summary`.
   `SummaryController` hands the scores and vitals to `OpenAiService` and streams
   the model's response back token by token, writing directly to the response body
   and flushing per token so the summary types into the UI live.

A deliberate design choice: all the data-shaping and third-party integration lives
in the API layer, so the frontend receives clean, typed data rather than raw
third-party responses.

---

## Running locally

You'll need: Node 20+, the .NET 10 SDK, a Google PageSpeed API key, and an OpenAI
API key (with prepaid credit).

### Backend (`api/`)

```bash
cd api
dotnet user-secrets set "PageSpeed:ApiKey" "YOUR_PAGESPEED_KEY"
dotnet user-secrets set "OpenAi:ApiKey" "YOUR_OPENAI_KEY"
dotnet run
```

The API starts on `http://localhost:5188` (check the console output for the exact
port). Visit the OpenAPI page printed on startup to see the available endpoints.

### Frontend (`web/`)

```bash
cd web
# .env.local — point the frontend at the API:
#   NEXT_PUBLIC_API_URL=http://localhost:5188
npm install
npm run dev
```

The app runs on `http://localhost:3000`. Paste a URL and run an audit.

> Run both in separate terminals. CORS is configured on the API to allow the
> frontend origin.

---

## API endpoints

| Method | Route          | Purpose                                              |
|--------|----------------|------------------------------------------------------|
| POST   | `/api/audit`   | Run a Lighthouse audit for a URL; returns scores + vitals |
| POST   | `/api/summary` | Stream a plain-English AI summary of an audit result |
| GET    | `/api/history` | *(in progress)* Return prior audits for a URL        |

---

## Project structure

```
siteanalyser/
├── web/                  # React / Next.js frontend
│   └── src/
│       ├── app/page.tsx
│       └── components/
│           ├── AuditResults.tsx
│           └── CoreWebVitals.tsx
└── api/                  # ASP.NET Core backend
    ├── Controllers/
    │   ├── AuditController.cs
    │   └── SummaryController.cs
    ├── Services/
    │   ├── PageSpeedService.cs
    │   └── OpenAiService.cs
    ├── Models/
    └── Program.cs
```

---

## Roadmap

- [ ] Persist each audit to Postgres (EF Core)
- [ ] `/api/history` endpoint + trend chart of scores over time
- [ ] Playwright end-to-end and API tests
- [ ] Deploy (API to Azure App Service, frontend to Netlify)

---

## Notes

This started life as a Next.js-only app and was re-architected to put the entire
backend in C# / ASP.NET Core — a deliberate move to build the project around a
React-frontend / .NET-API architecture. Write-up of the build is in the blog post.