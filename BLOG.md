# Building SiteAnalyser: a React front end on a C# backend

I wanted a project that paired React with a .NET backend in something closer to a
real application than a tutorial — a deployed tool I'd actually use, built the way
I'd build it at work. SiteAnalyser is the result so far: a React single-page app on
an ASP.NET Core API, integrating Google's PageSpeed Insights and OpenAI, with audit
history on the way. Here's the build.

## What it does

SiteAnalyser audits a website. You paste a URL, it runs Google's Lighthouse audit
through the PageSpeed Insights API, and it surfaces the four headline scores —
performance, accessibility, best practices, SEO — alongside the Core Web Vitals that
actually feed into search ranking. It then passes those metrics to an AI model, which
returns a plain-English summary: the overall verdict, the highest-impact fixes, and
what the site already does well. The summary streams into the UI token by token
rather than blocking on the full response.

## The shape of it

The architecture is deliberately conventional: a React front end and an ASP.NET Core
Web API as two independent processes, coupled only by a JSON-over-HTTP contract.

```
React (Next.js, TS)  --HTTP/JSON-->  ASP.NET Core API (C#/.NET 10)  -->  PageSpeed
   localhost:3000     <----------     localhost:5188                 -->  OpenAI
```

The API owns all the integration and data-shaping work; the front end receives clean,
typed data and renders it. Keeping that boundary disciplined is what lets the two
sides evolve and deploy independently — and, as it turned out, it's also where the
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

None of that is novel — it's the point. The interesting part of this project was
React, and pairing it with a backend I could write quickly let me spend my attention
on the front end.

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
obvious approach — returning `IAsyncEnumerable<string>` from the action and yielding
tokens — looks correct and compiles, but the framework buffers the enumerable and
flushes it only once the model has finished. The typewriter effect disappears: you
wait, then get everything at once.

The fix is to bypass the buffering and write to `Response.Body` directly, flushing
after each token so every fragment goes out immediately, with `HttpContext.RequestAborted`
threaded through so the stream stops cleanly if the client disconnects. It mirrors what
the front end is doing with a `ReadableStream` reader on the other end — both halves
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
intact. In a decoupled architecture the contract is the integration — line the shapes
up and it just works; get them subtly out of step and you get a silent `NaN` with no
exception to chase.

## Where it stands

The audit-and-summary pipeline runs end to end through the C# API. Next is
persistence — Entity Framework Core against Postgres, storing each audit so the tool
can chart a site's scores over time — followed by tests and deployment to Azure.

The project does what I wanted it to: it's a working full-stack application that
happens to be a genuinely useful tool, built on the React/.NET pairing I work in,
with the React side stretched enough to be worth writing about.