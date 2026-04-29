import Link from 'next/link'
import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 bg-background z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-[7px] h-[7px] rounded-full bg-[#1D9E75] shrink-0" />
          <span className="font-serif text-xl">Strata</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            docs
          </Link>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            pricing
          </a>
          <Link
            href="/signup"
            className="text-sm bg-foreground text-background rounded-lg px-4 py-1.5 hover:opacity-80 transition-opacity"
          >
            get api key
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-4 px-6 flex justify-between items-center">
        <span className="font-serif text-sm italic text-muted-foreground">
          knowledge that holds.
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">
          strata.dev · docs · status
        </span>
      </footer>
    </div>
  )
}
