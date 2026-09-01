import { Link } from "@tanstack/react-router";
import logo from "@/assets/satsuma-logo.png.asset.json";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-foreground">Auto WebMCP</span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            by
            <img
              src={logo.url}
              alt="Satsuma.ai"
              className="h-3 w-auto"
              style={{ filter: "brightness(1.15)" }}
            />
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/activate" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Install</Link>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> WebMCP live on this page
          </span>
        </div>
      </div>
    </header>
  );
}

export function SatsumaLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Satsuma.ai"
      className={className}
      style={{ filter: "brightness(1.15)" }}
    />
  );
}

export function Logo() {
  return <SatsumaLogo className="h-auto" />;
}
