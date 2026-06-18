import { Link } from "@tanstack/react-router";
import logo from "@/assets/satsuma-logo.png.asset.json";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <SatsumaLogo className="h-6 w-auto" />
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Auto WebMCP
          </span>
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

export function SatsumaLogo({ className = "h-6 w-auto" }: { className?: string }) {
  // Use the mark + wordmark; rely on filter to keep wordmark legible on dark bg
  return (
    <img
      src={logo.url}
      alt="Satsuma.ai"
      className={className}
      style={{ filter: "brightness(1.15)" }}
    />
  );
}

// Legacy export kept for any prior imports
export function Logo({ size = 22 }: { size?: number }) {
  return <SatsumaLogo className="h-auto" />;
}
