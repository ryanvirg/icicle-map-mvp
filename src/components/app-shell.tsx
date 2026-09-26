import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-800 bg-[#1a2f4a] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-lg font-bold"
              aria-hidden
            >
              ❄
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">
                Icicle Strategy
              </p>
              <p className="text-xs text-slate-300">
                Watershed map · scenario explorer (MVP slice)
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md bg-white/15 px-3 py-1.5 font-medium"
            >
              Map
            </Link>
            <a
              href="https://iciclestrategy.com/about/guiding-principles"
              className="rounded-md px-3 py-1.5 text-slate-200 hover:bg-white/10"
              target="_blank"
              rel="noreferrer"
            >
              Guiding Principles
            </a>
            <a
              href="https://icicle-v030.azurewebsites.net/"
              className="rounded-md px-3 py-1.5 text-slate-200 hover:bg-white/10"
              target="_blank"
              rel="noreferrer"
            >
              Season chart (Phase 1)
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p>
          Illustrative pre-run hydrology and routing — not operational advice.
          Hydrology is not re-run in the browser.{" "}
          <a
            href="https://www.ok.fwmt.net/Scenario/Manager"
            className="text-[#1e3a5f] underline"
            target="_blank"
            rel="noreferrer"
          >
            Okanagan FWMT
          </a>{" "}
          inspired scenario metadata pattern.
        </p>
      </footer>
    </div>
  );
}
