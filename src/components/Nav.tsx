import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">Satsuma <span className="text-muted-foreground font-normal">Auto WebMCP</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/activate" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Activation</Link>
          <Link to="/agent-preview" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Agent preview</Link>
          <Link to="/settings" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Settings</Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Demo mode
          </span>
        </div>
      </div>
    </header>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md"
      style={{
        width: size,
        height: size,
        background: "var(--gradient-glow)",
        boxShadow: "0 4px 14px -2px oklch(0.78 0.165 55 / 0.5)",
      }}
    >
      <span className="block h-1.5 w-1.5 rounded-full bg-background/90" />
    </span>
  );
}
