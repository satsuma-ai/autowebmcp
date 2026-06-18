import type { ToolSafety } from "@/lib/store";

export function SafetyBadge({ safety }: { safety: ToolSafety }) {
  const map: Record<ToolSafety, { label: string; cls: string }> = {
    safe: { label: "Safe actuation", cls: "bg-success/15 text-success border-success/30" },
    confirmation_required: { label: "Confirmation required", cls: "bg-warning/15 text-warning border-warning/30" },
    sensitive: { label: "Sensitive", cls: "bg-violet/15 text-violet border-violet/30" },
  };
  const { label, cls } = map[safety];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}>{label}</span>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10.5px] font-medium text-info">
      <span className="h-1.5 w-1.5 rounded-full bg-info" /> {pct}% confidence
    </span>
  );
}
