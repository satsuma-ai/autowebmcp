import type { ProjectState, SiteCategory, WebMCPTool } from "./store";

export function parseDomain(url: string): { domain: string; slug: string; name: string } {
  let domain = url.trim();
  try {
    const u = new URL(domain.startsWith("http") ? domain : `https://${domain}`);
    domain = u.hostname.replace(/^www\./, "");
  } catch {
    domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
  const base = domain.split(".")[0] || domain;
  const name = base.charAt(0).toUpperCase() + base.slice(1);
  return { domain, slug: domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), name };
}

const KEYWORDS: Record<SiteCategory, string[]> = {
  ecommerce: ["shop", "store", "buy", "cart", "amazon", "shopify", "etsy", "ebay", "walmart", "target", "doordash", "ubereats", "instacart"],
  restaurant: ["restaurant", "cafe", "bistro", "pizza", "kitchen", "eats", "menu", "dine", "grill", "sushi", "opentable", "resy"],
  saas: ["app", "io", "ai", "cloud", "labs", "hq", "tech", "soft", "stripe", "linear", "vercel", "notion", "slack", "calendly", "figma"],
  healthcare: ["clinic", "dental", "health", "medical", "care", "doctor", "hospital", "pediatric", "ortho", "derm"],
  real_estate: ["realty", "homes", "estate", "zillow", "redfin", "compass", "realtor", "properties"],
  marketplace: ["marketplace", "airbnb", "vrbo", "fiverr", "upwork", "thumbtack", "angi"],
  media: ["news", "times", "post", "blog", "media", "magazine", "nytimes", "verge", "techcrunch"],
  nonprofit: ["org", "foundation", "charity", "nonprofit", "ngo"],
  generic: [],
};

export function classify(domain: string): SiteCategory {
  const d = domain.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [SiteCategory, string[]][]) {
    if (words.some((w) => d.includes(w))) return cat;
  }
  if (d.endsWith(".org")) return "nonprofit";
  if (d.endsWith(".io") || d.endsWith(".ai") || d.endsWith(".dev")) return "saas";
  return "generic";
}

interface ToolSeed extends Omit<WebMCPTool, "enabled" | "confidence"> {
  confidence?: number;
}

function mk(t: ToolSeed): WebMCPTool {
  return { confidence: 0.86 + Math.random() * 0.12, enabled: true, ...t } as WebMCPTool;
}

const CATEGORY_SUMMARY: Record<SiteCategory, { summary: string; primaryGoal: string }> = {
  ecommerce: { summary: "Online retail destination with product catalog, search, and checkout flows.", primaryGoal: "Drive product discovery and purchases" },
  restaurant: { summary: "Hospitality site with menu, reservations, and ordering.", primaryGoal: "Convert visits into reservations and orders" },
  saas: { summary: "Software product site with demo requests, docs, and support.", primaryGoal: "Capture qualified demo and trial signups" },
  healthcare: { summary: "Clinical practice site with appointments, locations, and intake.", primaryGoal: "Convert visits into booked appointments" },
  real_estate: { summary: "Property marketplace with search, tours, and agent contact.", primaryGoal: "Match buyers to listings and agents" },
  marketplace: { summary: "Two-sided marketplace connecting providers and customers.", primaryGoal: "Match supply and demand at scale" },
  media: { summary: "Publication with articles, subscriptions, and topical browsing.", primaryGoal: "Grow readership and subscriptions" },
  nonprofit: { summary: "Mission-driven org with donations, volunteering, and updates.", primaryGoal: "Drive donations and engagement" },
  generic: { summary: "Business website with contact, content, and lead capture.", primaryGoal: "Capture leads and inform visitors" },
};

function toolsFor(category: SiteCategory, name: string): WebMCPTool[] {
  switch (category) {
    case "ecommerce":
      return [
        mk({ name: "search_products", label: "Search products", description: `Search the ${name} catalog by keyword, category, and filters.`, type: "search", method: "GET", path: "/api/search", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search keywords" }, category: { type: "string" }, max_price: { type: "number" } }, required: ["query"] }, examplePrompt: `Find wireless headphones under $200 on ${name}` }),
        mk({ name: "check_inventory", label: "Check inventory", description: "Check live availability for a specific product and variant.", type: "content", method: "GET", path: "/api/inventory", safety: "safe", inputSchema: { type: "object", properties: { product_id: { type: "string" }, variant: { type: "string" } }, required: ["product_id"] }, examplePrompt: "Is product SKU-9981 in stock in size medium?" }),
        mk({ name: "add_to_cart", label: "Add to cart", description: "Add an item to the customer's cart.", type: "transaction", method: "POST", path: "/api/cart", safety: "confirmation_required", inputSchema: { type: "object", properties: { product_id: { type: "string" }, quantity: { type: "number" } }, required: ["product_id", "quantity"] }, examplePrompt: "Add two of these to my cart" }),
        mk({ name: "check_order_status", label: "Check order status", description: "Look up the status of a customer order.", type: "account", method: "GET", path: "/api/orders/status", safety: "sensitive", inputSchema: { type: "object", properties: { order_id: { type: "string" }, email: { type: "string", format: "email" } }, required: ["order_id", "email"] }, examplePrompt: "Where is my order #84421?" }),
        mk({ name: "start_return", label: "Start a return", description: "Initiate a return for an order.", type: "support", method: "POST", path: "/api/returns", safety: "confirmation_required", inputSchema: { type: "object", properties: { order_id: { type: "string" }, reason: { type: "string" } }, required: ["order_id", "reason"] }, examplePrompt: "Start a return for order #84421" }),
      ];
    case "restaurant":
      return [
        mk({ name: "browse_menu", label: "Browse menu", description: `Browse the ${name} menu with categories and dietary filters.`, type: "content", method: "GET", path: "/menu", safety: "safe", inputSchema: { type: "object", properties: { category: { type: "string" }, dietary: { type: "string", enum: ["vegan", "vegetarian", "gluten_free"] } }, required: [] }, examplePrompt: `Show me vegetarian entrees at ${name}` }),
        mk({ name: "find_available_times", label: "Find reservation times", description: "Find available reservation times for a given party size and date.", type: "search", method: "GET", path: "/api/reservations/availability", safety: "safe", inputSchema: { type: "object", properties: { date: { type: "string", format: "date" }, party_size: { type: "number" } }, required: ["date", "party_size"] }, examplePrompt: "Any tables for 4 next Friday at 7pm?" }),
        mk({ name: "book_reservation", label: "Book reservation", description: "Book a table at the restaurant.", type: "booking", method: "POST", path: "/api/reservations", safety: "confirmation_required", inputSchema: { type: "object", properties: { date: { type: "string" }, time: { type: "string" }, party_size: { type: "number" }, name: { type: "string" }, phone: { type: "string" } }, required: ["date", "time", "party_size", "name", "phone"] }, examplePrompt: "Book a table for 4 at 7pm Friday under Smith" }),
        mk({ name: "request_catering_quote", label: "Request catering quote", description: "Request a catering quote for an event.", type: "form", method: "POST", path: "/catering", safety: "safe", inputSchema: { type: "object", properties: { event_date: { type: "string" }, guests: { type: "number" }, email: { type: "string", format: "email" } }, required: ["event_date", "guests", "email"] }, examplePrompt: "Quote catering for 50 people on June 12" }),
      ];
    case "saas":
      return [
        mk({ name: "request_demo", label: "Request a demo", description: `Submit a demo request for the ${name} product.`, type: "form", method: "POST", path: "/demo", safety: "safe", inputSchema: { type: "object", properties: { name: { type: "string" }, work_email: { type: "string", format: "email" }, company: { type: "string" }, team_size: { type: "string" } }, required: ["name", "work_email", "company"] }, examplePrompt: `Book a demo of ${name} for our 200-person team` }),
        mk({ name: "contact_sales", label: "Contact sales", description: "Open a conversation with the sales team.", type: "form", method: "POST", path: "/contact-sales", safety: "safe", inputSchema: { type: "object", properties: { work_email: { type: "string", format: "email" }, message: { type: "string" } }, required: ["work_email", "message"] }, examplePrompt: "Ask sales about enterprise pricing" }),
        mk({ name: "search_docs", label: "Search documentation", description: "Search product documentation and guides.", type: "search", method: "GET", path: "/docs/search", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, examplePrompt: "How do I configure SSO?" }),
        mk({ name: "create_support_ticket", label: "Create support ticket", description: "File a support ticket with the team.", type: "support", method: "POST", path: "/support/tickets", safety: "confirmation_required", inputSchema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" }, email: { type: "string", format: "email" } }, required: ["subject", "body", "email"] }, examplePrompt: "Open a ticket about a billing issue" }),
        mk({ name: "start_free_trial", label: "Start free trial", description: "Start a free trial of the product.", type: "account", method: "POST", path: "/signup", safety: "confirmation_required", inputSchema: { type: "object", properties: { work_email: { type: "string", format: "email" } }, required: ["work_email"] }, examplePrompt: "Start a free trial with my work email" }),
      ];
    case "healthcare":
      return [
        mk({ name: "request_appointment", label: "Request appointment", description: `Request an appointment at ${name}.`, type: "booking", method: "POST", path: "/appointments", safety: "confirmation_required", inputSchema: { type: "object", properties: { patient_name: { type: "string" }, phone: { type: "string" }, reason: { type: "string" }, preferred_date: { type: "string", format: "date" } }, required: ["patient_name", "phone", "reason"] }, examplePrompt: `Book a cleaning at ${name} next week` }),
        mk({ name: "find_location", label: "Find a location", description: "Find the nearest clinic location and hours.", type: "search", method: "GET", path: "/locations", safety: "safe", inputSchema: { type: "object", properties: { zip: { type: "string" } }, required: ["zip"] }, examplePrompt: "Closest office to 94110?" }),
        mk({ name: "submit_new_patient_intake", label: "Submit new patient intake", description: "Submit a new patient intake form.", type: "form", method: "POST", path: "/new-patient", safety: "sensitive", inputSchema: { type: "object", properties: { name: { type: "string" }, dob: { type: "string", format: "date" }, insurance: { type: "string" } }, required: ["name", "dob"] }, examplePrompt: "I'm a new patient and want to register" }),
        mk({ name: "check_insurance_accepted", label: "Check insurance accepted", description: "Check whether an insurance provider is accepted.", type: "content", method: "GET", path: "/insurance", safety: "safe", inputSchema: { type: "object", properties: { provider: { type: "string" } }, required: ["provider"] }, examplePrompt: "Do you accept Delta Dental PPO?" }),
      ];
    case "real_estate":
      return [
        mk({ name: "search_properties", label: "Search properties", description: "Search listings by location, price, and beds.", type: "search", method: "GET", path: "/search", safety: "safe", inputSchema: { type: "object", properties: { location: { type: "string" }, min_price: { type: "number" }, max_price: { type: "number" }, beds: { type: "number" } }, required: ["location"] }, examplePrompt: "3-bed homes in Austin under $700k" }),
        mk({ name: "estimate_home_value", label: "Estimate home value", description: "Get an automated home value estimate.", type: "content", method: "GET", path: "/estimate", safety: "safe", inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] }, examplePrompt: "What's 123 Main St worth?" }),
        mk({ name: "schedule_tour", label: "Schedule a tour", description: "Schedule a property tour.", type: "booking", method: "POST", path: "/tour", safety: "confirmation_required", inputSchema: { type: "object", properties: { listing_id: { type: "string" }, date: { type: "string" } }, required: ["listing_id", "date"] }, examplePrompt: "Tour this house Saturday afternoon" }),
        mk({ name: "contact_agent", label: "Contact agent", description: "Send a message to the listing agent.", type: "form", method: "POST", path: "/agent/contact", safety: "safe", inputSchema: { type: "object", properties: { listing_id: { type: "string" }, message: { type: "string" }, email: { type: "string", format: "email" } }, required: ["listing_id", "message", "email"] }, examplePrompt: "Ask the agent if pets are allowed" }),
      ];
    case "marketplace":
      return [
        mk({ name: "search_listings", label: "Search listings", description: "Search the marketplace with filters.", type: "search", method: "GET", path: "/search", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, examplePrompt: "Find logo designers under $300" }),
        mk({ name: "request_quote", label: "Request a quote", description: "Request a quote from a provider.", type: "form", method: "POST", path: "/quote", safety: "safe", inputSchema: { type: "object", properties: { provider_id: { type: "string" }, details: { type: "string" } }, required: ["provider_id", "details"] }, examplePrompt: "Get a quote for a kitchen remodel" }),
        mk({ name: "message_provider", label: "Message provider", description: "Send a message to a provider.", type: "support", method: "POST", path: "/messages", safety: "confirmation_required", inputSchema: { type: "object", properties: { provider_id: { type: "string" }, body: { type: "string" } }, required: ["provider_id", "body"] }, examplePrompt: "Ask about availability next month" }),
        mk({ name: "save_favorite", label: "Save favorite", description: "Save a listing to favorites.", type: "account", method: "POST", path: "/favorites", safety: "safe", inputSchema: { type: "object", properties: { listing_id: { type: "string" } }, required: ["listing_id"] }, examplePrompt: "Save this one for later" }),
      ];
    case "media":
      return [
        mk({ name: "search_articles", label: "Search articles", description: "Search published articles.", type: "search", method: "GET", path: "/search", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string" }, since: { type: "string", format: "date" } }, required: ["query"] }, examplePrompt: "Latest coverage of AI regulation" }),
        mk({ name: "subscribe_newsletter", label: "Subscribe to newsletter", description: "Subscribe an email to a newsletter.", type: "form", method: "POST", path: "/newsletter", safety: "safe", inputSchema: { type: "object", properties: { email: { type: "string", format: "email" }, list: { type: "string" } }, required: ["email"] }, examplePrompt: "Subscribe me to the morning brief" }),
        mk({ name: "start_subscription", label: "Start subscription", description: "Begin a paid subscription.", type: "transaction", method: "POST", path: "/subscribe", safety: "confirmation_required", inputSchema: { type: "object", properties: { plan: { type: "string" }, email: { type: "string", format: "email" } }, required: ["plan", "email"] }, examplePrompt: "Subscribe to the annual digital plan" }),
        mk({ name: "save_article", label: "Save article", description: "Save an article to read later.", type: "account", method: "POST", path: "/saved", safety: "safe", inputSchema: { type: "object", properties: { article_id: { type: "string" } }, required: ["article_id"] }, examplePrompt: "Save this for later" }),
      ];
    case "nonprofit":
      return [
        mk({ name: "make_donation", label: "Make a donation", description: "Submit a donation.", type: "transaction", method: "POST", path: "/donate", safety: "confirmation_required", inputSchema: { type: "object", properties: { amount: { type: "number" }, frequency: { type: "string", enum: ["once", "monthly"] }, email: { type: "string", format: "email" } }, required: ["amount", "email"] }, examplePrompt: "Donate $50 monthly" }),
        mk({ name: "volunteer_signup", label: "Volunteer signup", description: "Sign up to volunteer.", type: "form", method: "POST", path: "/volunteer", safety: "safe", inputSchema: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" }, interest: { type: "string" } }, required: ["name", "email"] }, examplePrompt: "I'd like to volunteer this fall" }),
        mk({ name: "subscribe_updates", label: "Subscribe to updates", description: "Subscribe to mission updates.", type: "form", method: "POST", path: "/updates", safety: "safe", inputSchema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] }, examplePrompt: "Send me program updates" }),
        mk({ name: "find_event", label: "Find an event", description: "Find upcoming events.", type: "search", method: "GET", path: "/events", safety: "safe", inputSchema: { type: "object", properties: { city: { type: "string" } }, required: [] }, examplePrompt: "Any fundraisers in Chicago?" }),
      ];
    default:
      return [
        mk({ name: "submit_contact_request", label: "Submit contact request", description: `Submit the ${name} contact form.`, type: "form", method: "POST", path: "/contact", safety: "safe", inputSchema: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" }, message: { type: "string" } }, required: ["name", "email", "message"] }, examplePrompt: `Reach out to ${name} about a partnership` }),
        mk({ name: "request_quote", label: "Request a quote", description: "Request a service quote.", type: "form", method: "POST", path: "/quote", safety: "safe", inputSchema: { type: "object", properties: { service: { type: "string" }, email: { type: "string", format: "email" } }, required: ["service", "email"] }, examplePrompt: "Get a quote for consulting" }),
        mk({ name: "subscribe_newsletter", label: "Subscribe to newsletter", description: "Subscribe to email updates.", type: "form", method: "POST", path: "/newsletter", safety: "safe", inputSchema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] }, examplePrompt: "Sign me up for the newsletter" }),
        mk({ name: "search_site", label: "Search site", description: "Search across the website.", type: "search", method: "GET", path: "/search", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, examplePrompt: "Find the pricing page" }),
      ];
  }
}

const CDN_PROVIDERS: { id: string; name: string }[] = [
  { id: "cloudflare", name: "Cloudflare Workers" },
  { id: "akamai", name: "Akamai EdgeWorkers" },
  { id: "fastly", name: "Fastly Compute / VCL" },
  { id: "human", name: "HUMAN Enforcer" },
  { id: "datadome", name: "DataDome Edge Module" },
];

const CDN_OVERRIDES: Record<string, string> = {
  "doordash.com": "cloudflare",
  "ubereats.com": "fastly",
  "opentable.com": "akamai",
  "calendly.com": "cloudflare",
  "zillow.com": "fastly",
  "shopify.com": "cloudflare",
  "stripe.com": "cloudflare",
  "linear.app": "cloudflare",
  "notion.so": "cloudflare",
  "figma.com": "fastly",
  "vercel.com": "cloudflare",
  "nytimes.com": "fastly",
  "airbnb.com": "akamai",
  "amazon.com": "akamai",
};

function evidenceFor(providerId: string, domain: string): string[] {
  switch (providerId) {
    case "cloudflare":
      return [
        `server: cloudflare on ${domain}`,
        `cf-ray response header observed`,
        `cf-cache-status: HIT on static assets`,
      ];
    case "akamai":
      return [
        `x-akamai-transformed header observed on ${domain}`,
        `akamai-grn request id present`,
        `edge hostname pattern *.edgekey.net`,
      ];
    case "fastly":
      return [
        `server: fastly response header on ${domain}`,
        `x-served-by: cache-* edge POPs`,
        `x-cache: HIT, HIT chain detected`,
      ];
    case "human":
      return [
        `_px3 / _pxhd cookies present on ${domain}`,
        `HUMAN sensor script loaded`,
        `Enforcer challenge response observed`,
      ];
    case "datadome":
      return [
        `datadome cookie present on ${domain}`,
        `js.datadome.co tag loaded`,
        `x-datadome response header observed`,
      ];
    default:
      return [`CDN fingerprint matched for ${domain}`];
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function detectCdn(domain: string): import("./store").DetectedCdn {
  const key = domain.toLowerCase();
  const overrideId = CDN_OVERRIDES[key];
  const pick =
    CDN_PROVIDERS.find((p) => p.id === overrideId) ??
    CDN_PROVIDERS.find((p) => p.id === "cloudflare")!;
  return {
    providerId: pick.id,
    providerName: pick.name,
    evidence: evidenceFor(pick.id, key),
    confidence: 0.94 + (hashStr(key) % 5) / 100,
  };
}

export function generateProject(rawUrl: string): ProjectState {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const { domain, slug, name } = parseDomain(url);
  const category = classify(domain);
  const { summary, primaryGoal } = CATEGORY_SUMMARY[category];
  const tools = toolsFor(category, name);
  const formsFound = 2 + Math.floor(Math.random() * 4);
  const ctasFound = 5 + Math.floor(Math.random() * 9);
  const detectedCdn = detectCdn(domain);
  return {
    url,
    domain,
    siteName: name,
    category,
    summary,
    primaryGoal,
    scan: {
      formsFound,
      ctasFound,
      apiCandidates: tools.length,
      confidence: 0.88 + Math.random() * 0.08,
      warnings: category === "generic" ? ["Limited structured data detected — using safe defaults"] : [],
    },
    tools,
    detectedCdn,
    activationStatus: "idle",
    previewUrl: `https://agent-preview.autowebmcp.demo/${slug}`,
    createdAt: Date.now(),
  };
}

export function categoryLabel(c: SiteCategory): string {
  return c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
