import { useSyncExternalStore } from "react";

export type ToolSafety = "safe" | "confirmation_required" | "sensitive";
export type SiteCategory =
  | "food_delivery"
  | "ecommerce"
  | "restaurant"
  | "saas"
  | "healthcare"
  | "real_estate"
  | "marketplace"
  | "media"
  | "nonprofit"
  | "automotive"
  | "travel"
  | "generic";

export interface WebMCPTool {
  name: string;
  label: string;
  description: string;
  type: "form" | "navigation" | "search" | "transaction" | "support" | "booking" | "account" | "content";
  method: "GET" | "POST";
  path: string;
  safety: ToolSafety;
  confidence: number;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; format?: string; enum?: string[] }>;
    required: string[];
  };
  examplePrompt: string;
  enabled: boolean;
}

export interface ScanResult {
  formsFound: number;
  ctasFound: number;
  apiCandidates: number;
  confidence: number;
  warnings: string[];
}

export interface DetectedCdn {
  providerId: string;
  providerName: string;
  evidence: string[];
  confidence: number;
}

export interface ExistingWebmcpInfo {
  present: boolean;
  kind: "none" | "webmcp" | "mcp-server";
  platform?: string;
  signals: string[];
  endpoints: string[];
  toolNames: string[];
  confidence: number;
  note?: string;
}

export interface ProjectState {
  url: string;
  domain: string;
  siteName: string;
  category: SiteCategory;
  summary: string;
  primaryGoal: string;
  scan: ScanResult;
  tools: WebMCPTool[];
  detectedCdn: DetectedCdn;
  platform?: string;
  existingWebmcp?: ExistingWebmcpInfo;
  selectedProvider?: string;
  activationStatus: "idle" | "activating" | "active";
  previewUrl?: string;
  createdAt: number;
}

const KEY = "autowebmcp.project";
let listeners = new Set<() => void>();
let state: ProjectState | null = null;

function load(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProjectState) : null;
  } catch {
    return null;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  if (state) sessionStorage.setItem(KEY, JSON.stringify(state));
  else sessionStorage.removeItem(KEY);
}

function emit() {
  listeners.forEach((l) => l());
}

export const projectStore = {
  get(): ProjectState | null {
    if (state === null && typeof window !== "undefined") state = load();
    return state;
  },
  set(next: ProjectState | null) {
    state = next;
    persist();
    emit();
  },
  patch(p: Partial<ProjectState>) {
    if (!state) state = load();
    if (!state) return;
    state = { ...state, ...p };
    persist();
    emit();
  },
  updateTool(name: string, patch: Partial<WebMCPTool>) {
    if (!state) return;
    state = {
      ...state,
      tools: state.tools.map((t) => (t.name === name ? { ...t, ...patch } : t)),
    };
    persist();
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useProject(): ProjectState | null {
  return useSyncExternalStore(
    projectStore.subscribe,
    () => projectStore.get(),
    () => null,
  );
}
