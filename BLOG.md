# Building SiteAnalyser: a React front end on a C# backend

I wanted a project that paired React with a .NET backend in something closer to a
real application than a tutorial and a deployed tool I'd actually use that is built the way
I'd build it at work. SiteAnalyser is the result: a React single-page app on an
ASP.NET Core API, integrating Google's PageSpeed Insights and OpenAI with audit
history persisted to Postgres and the whole thing deployed to Azure and Netlify via
GitHub Actions. Here's the build.

## What it does

SiteAnalyser audits a website. You paste a URL, it runs Google's Lighthouse audit
through the PageSpeed Insights API, and it surfaces the four headline scores:
performance, accessibility, best practices, SEO. In addition to these, it also fetches the Core Web Vitals that
actually feed into search ranking. It then passes those metrics to an AI model which
returns a plain-English summary: the overall verdict, the highest-impact fixes, and
what the site already does well. The summary streams into the UI token by token
rather than blocking on the full response. Each audit is saved to Postgres, so the
tool can chart a site's scores over time.

## The shape of it

The architecture is deliberately conventional: a React front end and an ASP.NET Core
Web API as two independent processes, coupled only by a JSON-over-HTTP contract.

The API owns all the integration and data-shaping work; the front end receives clean,
typed data and renders it. Keeping that boundary disciplined is what lets the two
sides evolve and deploy independently and as it turned out, it's also where the
most instructive bug lived (more on that below).

## The backend

The API is standard ASP.NET Core, structured the way I'd structure any service of
this size. Controllers stay thin and coordinate; the actual work lives in
constructor-injected services behind interfaces — `IPageSpeedService`,
`IOpenAiService` — registered in `Program.cs`. `AuditController` doesn't know how
PageSpeed is called; it takes an `IPageSpeedService` and asks it for a result. That
separation is mostly there to keep the integration logic testable: swapping a fake
PageSpeed service in for tests is trivial when the controller depends on the
interface rather than the concrete type.

`PageSpeedService` calls Google over a typed `HttpClient` (registered with
`AddHttpClient` so the factory manages the handler lifetime — `new`-ing up
`HttpClient` per request is the classic way to exhaust sockets under load), then
trims Google's very large response down to just the scores and vitals the UI needs.
Doing that shaping server-side keeps the contract clean and the front end simple.

## The front end, and the parts that took adjustment

React is the newer surface for me — I've spent more time in Vue and Nuxt — and a few
things genuinely needed a recalibration rather than a straight translation.

Next's App Router defaulting every component to a server component, with `'use client'`
as the opt-in for interactivity, is the inverse of Vue's always-live components. In
practice it pushes you to be deliberate about what actually ships to the browser,
which I came around to liking.

The re-render model is the real mental shift from Vue's reactivity. You don't mutate
state; you call a setter and the component function re-runs top to bottom. It bit me
exactly once, in a way worth recording: streaming the AI summary, I had to accumulate
tokens with the functional updater — `setSummary(prev => prev + chunk)` — because the
direct form closes over a stale value from the render in which the effect was created.
Coming from Vue's `ref` mutation, that's the kind of thing you only fully internalise
by hitting it.

## Streaming from an ASP.NET Core controller

The summary streams, and this was the one genuinely fiddly bit on the backend. The
obvious approach of returning `IAsyncEnumerable<string>` from the action and yielding
tokens looks correct and compiles, but the framework buffers the enumerable and
flushes it only once the model has finished. The typewriter effect disappears: you
wait, then get everything at once.

The fix is to bypass the buffering and write to `Response.Body` directly, flushing
after each token so every fragment goes out immediately with `HttpContext.RequestAborted`
threaded through so the stream stops cleanly if the client disconnects. It mirrors what
the front end is doing with a `ReadableStream` reader on the other end. Both halves
are explicit about pushing and pulling bytes rather than handing a serialized object
across.

## One contract, two type systems

The most useful debugging of the project happened at the seam between the stacks.
The React components had originally been written against the raw PageSpeed JSON —
scores nested as `{ performance: { score } }` and a large `audits` object. The C# API
returns a deliberately flatter shape: scores as `{ performance: number }` and a
trimmed `vitals` dictionary. The front end was reading fields that no longer existed
and rendering `NaN`.

The fix hinged on knowing precisely how `System.Text.Json` serialises by default:
property names are camelCased (`Url` -> `url`), but dictionary *keys* are left
untouched unless you set a `DictionaryKeyPolicy`. That's what let kebab-case keys like
`best-practices` and `largest-contentful-paint` survive the trip to the front end
intact. In a decoupled architecture the contract is the integration. line the shapes
up and it just works; get them subtly out of step and you get a silent `NaN` with no
exception to chase.

## Persistence with EF Core and Supabase

With the pipeline working, the next step was storing each audit. The approach is
straightforward: an `Audit` entity, an `AppDbContext`, and a migration to create the
table. Each call to `/api/audit` saves a row before returning the result, and
`HistoryController` serves the last 20 audits for any given URL so the frontend can
render a Recharts trend chart.

One EF Core gotcha worth noting: the `Npgsql.EntityFrameworkCore.PostgreSQL` package
had an `ObjectDisposedException` bug on `.NET 10` with Supabase in its `.0` releases.
Pinning to `10.0.1` and `Microsoft.EntityFrameworkCore.Design 10.0.4` resolved it.
When a stack is this new, paying attention to exact package versions is just part of
the job.

## Deploying to Azure via GitHub Actions

The final piece was deployment — and this is where the project earns its CI/CD story.

The repo is a monorepo: `web/` for the Next.js frontend and `api/` for the .NET
backend. The frontend deploys to Netlify automatically on push to `main`, which
required setting the base directory to `web/` in the Netlify config — the same
problem in a different wrapper. The backend deploys to Azure App Service via a GitHub
Actions workflow, and the monorepo wrinkle surfaces here too: Azure's auto-generated
workflow assumes the project is at the repo root. The fix is two characters — pointing
the `dotnet build` and `dotnet publish` steps at `api/SiteAnalyser.Api.csproj`
explicitly rather than letting the tooling hunt for a project at the root and find
nothing.

Authentication between GitHub Actions and Azure uses OIDC federated credentials
rather than a stored publish profile. The practical difference: instead of a
long-lived secret sitting in GitHub that can leak and needs rotating, the runner
requests a short-lived token at deploy time and Azure validates it against a trust
relationship configured on a managed identity. No credentials to rotate, nothing
sensitive in the repository.

The App Service is Linux on the F1 free tier which introduced one more packaging
consideration: F1 containers don't guarantee which .NET runtime versions are
installed, and .NET 10 wasn't available on the instance at deploy time. Publishing
as self-contained — adding `-r linux-x64 --self-contained true` to the publish
command bundles the runtime into the artifact and sidesteps the problem entirely.
It makes the artifact larger but removes the dependency on whatever the host happens
to have installed.

One infrastructure issue did surface in production that wouldn't appear locally:
Supabase now provisions direct database connections as IPv6-only by default, and
Azure's F1 containers are IPv4-only. The fix is to connect via Supabase's shared
session pooler rather than the direct endpoint — the connection string host changes,
and the username gains the project ref as a suffix. It's a one-line configuration
change once you know what's happening, but it's the kind of thing that only shows up
when you actually deploy to a cloud environment rather than running everything
locally. That's a reasonable argument for deploying early rather than late.

## Testing with Playwright

With the app deployed, the last piece was a test suite. Two test files cover the
core surface area.

The first tests the audit flow end to end: it visits the live site, submits a URL,
waits for the score cards to render, and asserts all four Lighthouse categories are
present. This is the test that proves the full stack is working: frontend, API,
PageSpeed integration and database write all exercise in a single run. The timeout
is generous (30 seconds) because PageSpeed calls have real latency.

The second tests the API directly using Playwright's `request` fixture rather than
a browser. It hits `/api/history`, checks the response is 200, and verifies the
returned data has the shape the frontend depends on. No browser involved but just an
HTTP client asserting a contract.

Both run in a GitHub Actions workflow on every push to `main`. The Azure deploy
workflow is configured to trigger only after the Playwright workflow completes
successfully, which means the backend cannot deploy if tests are red. It's a simple
gate but it catches the most important failure mode: a push that breaks the audit
flow never reaches production.

One practical note on testing against a live site: the audit test makes a real
PageSpeed call on every CI run, which ticks down your API quota. For this project
that's an acceptable trade-off. A higher-volume setup would mock the PageSpeed
response at the network boundary and test the UI behaviour independently of the
external API.

## Where it stands

SiteAnalyser is fully deployed and working end to end: paste a URL, get Lighthouse
scores and Core Web Vitals, read an AI summary that streams in live, see how the
site's scores have moved over time, and have confidence that a green CI run means
the whole stack is healthy.

The infrastructure is zero-cost. Azure F1, Netlify free tier, Supabase free tier
and every push to `main` triggers tests followed by an automated deploy if they pass.

The project does what I wanted it to: a working full-stack application on the
React/.NET pairing, with the backend written quickly enough that the React side got
proper attention, and the whole thing actually shipped.