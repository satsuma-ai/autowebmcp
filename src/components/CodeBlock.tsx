import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CodeBlock({ code, language = "ts", className = "" }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`code-panel relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-white/5 px-3.5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="ml-2">{language}</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
