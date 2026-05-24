import Image from 'next/image';

// Header echoing the portfolio. The logo SVG goes in /public/logo.svg.
// Clicking it returns the user to webdesignbyryan.com, framing SiteAnalyser
// as a companion tool to the freelance site.
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <a
          href="https://webdesignbyryan.com"
          className="flex items-center"
          aria-label="Web Design by Ryan — home"
        >
          {/* The logo is 200x60; scale it down to fit the bar. */}
          <Image src="/logo.svg" alt="Web Design by Ryan" width={150} height={45} priority />
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="https://webdesignbyryan.com"
            className="text-slate-600 hover:text-brand-600 transition-colors"
          >
            Portfolio
          </a>
          <a
            href="https://webdesignbyryan.com/blog"
            className="text-slate-600 hover:text-brand-600 transition-colors"
          >
            Blog
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 mt-16 py-8">
      <div className="container mx-auto max-w-5xl px-4 text-sm text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          Built by{' '}
          <a href="https://webdesignbyryan.com" className="text-brand-600 hover:underline">
            Web Design by Ryan
          </a>
        </span>
        <span>Powered by Google Lighthouse &amp; OpenAI</span>
      </div>
    </footer>
  );
}