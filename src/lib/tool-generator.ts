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
  food_delivery: ["doordash", "ubereats", "grubhub", "postmates", "seamless", "instacart", "deliveroo", "justeat", "gopuff", "delivery"],
  ecommerce: ["shop", "shops", "store", "stores", "buy", "cart", "amazon", "shopify", "etsy", "walmart", "target", "costco", "bestbuy", "ikea", "zara", "hm", "nike", "adidas", "sephora", "ulta", "wayfair", "chewy", "grocery", "groceries", "supermarket", "market", "mart", "convenience", "7eleven", "circlek", "pharmacy", "drugstore", "walgreens", "cvs", "kroger", "aldi", "tesco", "carrefour", "rewe", "edeka", "outlet", "boutique", "apparel", "retail", "goods", "supply", "depot", "wholesale"],
  restaurant: ["restaurant", "cafe", "bistro", "pizza", "kitchen", "eats", "menu", "dine", "grill", "sushi", "opentable", "resy"],
  saas: ["app", "io", "ai", "cloud", "labs", "hq", "tech", "soft", "stripe", "linear", "vercel", "notion", "slack", "calendly", "figma"],
  healthcare: ["clinic", "dental", "health", "medical", "care", "doctor", "hospital", "pediatric", "ortho", "derm"],
  real_estate: ["realty", "homes", "estate", "zillow", "redfin", "compass", "realtor", "properties"],
  marketplace: ["marketplace", "airbnb", "vrbo", "fiverr", "upwork", "thumbtack", "angi", "ebay", "mercari", "poshmark", "depop", "alibaba", "aliexpress", "vinted", "craigslist", "olx", "kleinanzeigen"],

  media: ["news", "times", "post", "blog", "media", "magazine", "nytimes", "verge", "techcrunch"],
  nonprofit: ["foundation", "charity", "nonprofit", "ngo"],
  automotive: ["mercedes", "benz", "bmw", "audi", "volkswagen", "porsche", "toyota", "honda", "ford", "hyundai", "kia", "volvo", "tesla", "nissan", "lexus", "jaguar", "renault", "peugeot", "motors", "automobile", "autohaus", "carmax", "cars", "auto"],
  travel: ["airlines", "airline", "flights", "hotel", "hotels", "booking", "expedia", "marriott", "hilton", "lufthansa", "delta", "travel", "cruise", "resort"],
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
  food_delivery: { summary: "On-demand food and grocery delivery marketplace with store search, menus, carts, and order tracking.", primaryGoal: "Turn a craving into a placed, tracked delivery order" },
  ecommerce: { summary: "Online retail destination with product catalog, search, and checkout flows.", primaryGoal: "Drive product discovery and purchases" },
  restaurant: { summary: "Hospitality site with menu, reservations, and ordering.", primaryGoal: "Convert visits into reservations and orders" },
  saas: { summary: "Software product site with demo requests, docs, and support.", primaryGoal: "Capture qualified demo and trial signups" },
  healthcare: { summary: "Clinical practice site with appointments, locations, and intake.", primaryGoal: "Convert visits into booked appointments" },
  real_estate: { summary: "Property marketplace with search, tours, and agent contact.", primaryGoal: "Match buyers to listings and agents" },
  marketplace: { summary: "Two-sided marketplace connecting providers and customers.", primaryGoal: "Match supply and demand at scale" },
  media: { summary: "Publication with articles, subscriptions, and topical browsing.", primaryGoal: "Grow readership and subscriptions" },
  automotive: { summary: "Vehicle manufacturer site with a model catalogue, online configurator, financing calculators, stock search, and test-drive booking.", primaryGoal: "Take a shopper from model browsing to a saved, priced, orderable build" },
  travel: { summary: "Travel booking site with availability search, fare/rate comparison, and reservation flows.", primaryGoal: "Turn a trip intent into a confirmed booking" },
  nonprofit: { summary: "Mission-driven org with donations, volunteering, and updates.", primaryGoal: "Drive donations and engagement" },
  generic: { summary: "Business website with contact, content, and lead capture.", primaryGoal: "Capture leads and inform visitors" },
};

function toolsFor(category: SiteCategory, name: string): WebMCPTool[] {
  switch (category) {
    case "food_delivery":
      return [
        mk({ name: "search_restaurants", label: "Search restaurants and stores", description: `Search ${name} for restaurants and stores that deliver to an address, with cuisine, price, rating, and delivery-time filters.`, type: "search", method: "GET", path: "/api/v1/search/stores", safety: "safe", inputSchema: { type: "object", properties: { query: { type: "string", description: "Cuisine, dish, or store name" }, address: { type: "string", description: "Delivery address or ZIP" }, max_delivery_minutes: { type: "number" }, min_rating: { type: "number" } }, required: ["query", "address"] }, examplePrompt: `Find Thai places on ${name} delivering to 60614 in under 30 minutes` }),
        mk({ name: "get_store_menu", label: "Get a store menu", description: "Fetch the live menu for a store, including item prices, options, and out-of-stock state.", type: "content", method: "GET", path: "/api/v1/stores/menu", safety: "safe", inputSchema: { type: "object", properties: { store_id: { type: "string" }, section: { type: "string", description: "Optional menu section" } }, required: ["store_id"] }, examplePrompt: "Show me the noodle section of that restaurant's menu" }),
        mk({ name: "add_items_to_cart", label: "Add items to cart", description: "Add one or more menu items with options and quantities to the current delivery cart.", type: "transaction", method: "POST", path: "/api/v1/cart/items", safety: "confirmation_required", inputSchema: { type: "object", properties: { store_id: { type: "string" }, item_id: { type: "string" }, quantity: { type: "number" }, options: { type: "string", description: "Comma separated option ids" }, special_instructions: { type: "string" } }, required: ["store_id", "item_id", "quantity"] }, examplePrompt: "Add two pad thai, medium spice, no peanuts" }),
        mk({ name: "quote_delivery", label: "Quote delivery fees and ETA", description: "Return delivery fee, taxes, service fee, and estimated arrival window for the current cart and address.", type: "content", method: "GET", path: "/api/v1/cart/quote", safety: "safe", inputSchema: { type: "object", properties: { cart_id: { type: "string" }, address: { type: "string" }, tip: { type: "number" } }, required: ["cart_id", "address"] }, examplePrompt: "What's the total with fees and how long will it take?" }),
        mk({ name: "place_delivery_order", label: "Place the delivery order", description: "Submit the cart as a delivery order using the saved payment method. Requires explicit user confirmation.", type: "transaction", method: "POST", path: "/api/v1/orders", safety: "confirmation_required", inputSchema: { type: "object", properties: { cart_id: { type: "string" }, address: { type: "string" }, tip: { type: "number" }, dropoff_instructions: { type: "string" } }, required: ["cart_id", "address"] }, examplePrompt: "Place the order, leave it at the door, $5 tip" }),
        mk({ name: "track_order", label: "Track an order", description: "Get live status, courier location, and ETA for an in-progress order.", type: "account", method: "GET", path: "/api/v1/orders/track", safety: "sensitive", inputSchema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] }, examplePrompt: "Where is my order right now?" }),
      ];
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
    case "automotive":
      return [
        mk({ name: "filter_configurator_catalog", label: "Filter the model catalogue", description: `Declarative: Lists and visually filters the live ${name} model catalogue by vehicle type, class, fuel and new-model controls; never auto-opens a model. Imperative: Optional vehicle_type, class_key, fuel_type, new_only; an empty object shows every model card.`, type: "search", method: "GET", path: "/api/configurator/catalog", safety: "safe", inputSchema: { type: "object", properties: { vehicle_type: { type: "string", description: "e.g. suv, saloon, estate, cabriolet" }, class_key: { type: "string", description: "Model class key, e.g. C-Class" }, fuel_type: { type: "string", enum: ["petrol", "diesel", "hybrid", "electric"] }, new_only: { type: "boolean" } }, required: [] }, examplePrompt: `Show me every electric SUV ${name} sells` }),
        mk({ name: "get_configurator_entry", label: "Resolve model presets", description: "Declarative: Resolves every live preset for one exact model type class and opens that model's preset selector without choosing a preset. Imperative: Requires type_class.", type: "content", method: "GET", path: "/api/configurator/entry", safety: "safe", inputSchema: { type: "object", properties: { type_class: { type: "string", description: "Factory type class code for the model" } }, required: ["type_class"] }, examplePrompt: "What trims can I start that model from?" }),
        mk({ name: "start_build", label: "Start a configuration", description: "Declarative: Starts a configuration from a model preset and returns its opaque build handle. Imperative: Requires type_class; optional pre_config_id (defaults to the base preset).", type: "transaction", method: "POST", path: "/api/configurator/builds", safety: "safe", inputSchema: { type: "object", properties: { type_class: { type: "string" }, pre_config_id: { type: "string", description: "Preset id; defaults to BASIC" } }, required: ["type_class"] }, examplePrompt: "Start configuring the base version of that model" }),
        mk({ name: "get_build", label: "Open a build", description: "Declarative: Opens a build handle in the configurator and returns pricing, range, motorization and selected options. Imperative: Requires vehicle_id.", type: "content", method: "GET", path: "/api/configurator/builds/get", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string", description: "Build handle from start_build" } }, required: ["vehicle_id"] }, examplePrompt: "Reopen my configuration and show the price" }),
        mk({ name: "list_options", label: "List options in a category", description: "Declarative: Opens one configurator category and lists compatible choices with price deltas in buyer language. Imperative: Requires vehicle_id + category (motorizations, packages, paint, wheels, upholstery, assistance, charging).", type: "content", method: "GET", path: "/api/configurator/options", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, category: { type: "string", enum: ["motorizations", "styles", "packages", "paint", "wheels", "upholstery", "multimedia", "assistance", "charging"] } }, required: ["vehicle_id", "category"] }, examplePrompt: "What wheels can I get on this build?" }),
        mk({ name: "search_options", label: "Search options in buyer language", description: 'Declarative: Searches configuration choices with buyer language ("sporty look", "brown leather", "blue paint") and opens the category holding the best match. Imperative: Requires vehicle_id + query.', type: "search", method: "GET", path: "/api/configurator/options/search", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, query: { type: "string" } }, required: ["vehicle_id", "query"] }, examplePrompt: "Find me a sporty look with brown leather" }),
        mk({ name: "preview_change", label: "Preview an option change", description: "Declarative: Previews the full dependency set, removals, incompatibilities and net price delta without applying anything, then shows the resulting summary as a visual preview. Imperative: Requires vehicle_id + option_ids[].", type: "content", method: "POST", path: "/api/configurator/preview", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, option_ids: { type: "array", description: "Option codes to preview together" } }, required: ["vehicle_id", "option_ids"] }, examplePrompt: "What does adding the AMG package remove or require?" }),
        mk({ name: "apply_change", label: "Apply a previewed change", description: "Declarative: Confirms exactly one previously previewed change, adopts its resulting build handle and dependency set, then opens the confirmed build summary. Imperative: Requires vehicle_id + resulting_vehicle_id (the confirmation token from preview_change).", type: "transaction", method: "POST", path: "/api/configurator/apply", safety: "confirmation_required", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, resulting_vehicle_id: { type: "string", description: "Confirmation token returned by preview_change" } }, required: ["vehicle_id", "resulting_vehicle_id"] }, examplePrompt: "Yes, apply that package" }),
        mk({ name: "get_build_summary", label: "Get the build summary", description: "Declarative: Opens the build-summary page and returns the complete configuration grouped by category with typed price, range, monthly rate, provenance and next actions. Imperative: Requires vehicle_id.", type: "content", method: "GET", path: "/api/configurator/summary", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" } }, required: ["vehicle_id"] }, examplePrompt: "Show me everything on this build with the total" }),
        mk({ name: "estimate_monthly_cost", label: "Estimate leasing or financing", description: "Declarative: Estimates a typed leasing or financing rate for the current configured price, term, annual mileage and optional down payment, then opens the build summary. Imperative: Requires vehicle_id; optional product, months, km_per_year, down_payment.", type: "content", method: "GET", path: "/api/finance/estimate", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, product: { type: "string", enum: ["leasing", "financing"] }, months: { type: "number" }, km_per_year: { type: "number" }, down_payment: { type: "number" } }, required: ["vehicle_id"] }, examplePrompt: "What's the monthly lease over 36 months at 15,000 km a year?" }),
        mk({ name: "check_delivery", label: "Check delivery availability", description: "Declarative: Checks the build's delivery availability class and whether it remains orderable, then opens its build summary. Imperative: Requires vehicle_id.", type: "content", method: "GET", path: "/api/configurator/delivery", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" } }, required: ["vehicle_id"] }, examplePrompt: "When could this car actually be delivered?" }),
        mk({ name: "find_similar_in_stock", label: "Find similar stock vehicles", description: "Declarative: Finds immediately available stock vehicles resembling the current build, explains matches and differences, and opens stock search. Imperative: Requires vehicle_id; optional radius_km, postal_code.", type: "search", method: "GET", path: "/api/stock/similar", safety: "safe", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, postal_code: { type: "string" }, radius_km: { type: "number" } }, required: ["vehicle_id"] }, examplePrompt: "Anything close to this already sitting on a lot near me?" }),
        mk({ name: "save_build", label: "Save the build", description: "Declarative: Saves and encodes the current build as a non-committing online code with a direct reopen URL, then opens that URL. Imperative: Requires vehicle_id.", type: "account", method: "POST", path: "/api/configurator/save", safety: "confirmation_required", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" } }, required: ["vehicle_id"] }, examplePrompt: "Save this configuration so I can come back to it" }),
        mk({ name: "book_test_drive", label: "Book a test drive", description: "Declarative: Requests a test drive of this model at a chosen dealer and date, then opens the confirmation view. Imperative: Requires model or vehicle_id, postal_code, and contact email; optional preferred_date.", type: "booking", method: "POST", path: "/api/test-drive", safety: "sensitive", inputSchema: { type: "object", properties: { vehicle_id: { type: "string" }, model: { type: "string" }, postal_code: { type: "string" }, email: { type: "string", format: "email" }, preferred_date: { type: "string", format: "date" } }, required: ["postal_code", "email"] }, examplePrompt: "Book me a test drive near 80331 next Saturday" }),
      ];
    case "travel":
      return [
        mk({ name: "search_availability", label: "Search availability", description: "Declarative: Searches live availability and prices for a route or destination and opens the results view. Imperative: Requires origin/destination and dates; optional guests, cabin.", type: "search", method: "GET", path: "/api/search", safety: "safe", inputSchema: { type: "object", properties: { origin: { type: "string" }, destination: { type: "string" }, depart_date: { type: "string", format: "date" }, return_date: { type: "string", format: "date" }, guests: { type: "number" }, cabin: { type: "string" } }, required: ["destination", "depart_date"] }, examplePrompt: "Find options to Lisbon in early June for two" }),
        mk({ name: "get_offer_details", label: "Get offer details", description: "Declarative: Opens one offer and returns its full fare/rate rules, inclusions and total price. Imperative: Requires offer_id.", type: "content", method: "GET", path: "/api/offers/details", safety: "safe", inputSchema: { type: "object", properties: { offer_id: { type: "string" } }, required: ["offer_id"] }, examplePrompt: "What's included in that fare?" }),
        mk({ name: "price_booking", label: "Price the booking", description: "Declarative: Prices the selected offer with taxes, fees and extras before any commitment. Imperative: Requires offer_id; optional extras[].", type: "content", method: "GET", path: "/api/booking/price", safety: "safe", inputSchema: { type: "object", properties: { offer_id: { type: "string" }, extras: { type: "array" } }, required: ["offer_id"] }, examplePrompt: "What's the real total with bags?" }),
        mk({ name: "hold_booking", label: "Hold the booking", description: "Declarative: Places a temporary hold on the offer and returns a booking handle. Imperative: Requires offer_id + lead_guest_email.", type: "transaction", method: "POST", path: "/api/booking/hold", safety: "confirmation_required", inputSchema: { type: "object", properties: { offer_id: { type: "string" }, lead_guest_email: { type: "string", format: "email" } }, required: ["offer_id", "lead_guest_email"] }, examplePrompt: "Hold that one for me" }),
        mk({ name: "confirm_booking", label: "Confirm the booking", description: "Declarative: Confirms a held booking with the saved payment method and opens the confirmation. Imperative: Requires booking_id.", type: "transaction", method: "POST", path: "/api/booking/confirm", safety: "sensitive", inputSchema: { type: "object", properties: { booking_id: { type: "string" } }, required: ["booking_id"] }, examplePrompt: "Confirm and book it" }),
        mk({ name: "manage_booking", label: "Look up a booking", description: "Declarative: Looks up an existing reservation and its change/cancel options. Imperative: Requires confirmation_code + last_name.", type: "account", method: "GET", path: "/api/booking/manage", safety: "sensitive", inputSchema: { type: "object", properties: { confirmation_code: { type: "string" }, last_name: { type: "string" } }, required: ["confirmation_code", "last_name"] }, examplePrompt: "Pull up my reservation" }),
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
  { id: "netlify", name: "Netlify Edge Functions" },
  { id: "vercel", name: "Vercel / Next.js" },
];

const CDN_OVERRIDES: Record<string, string> = {};

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
    case "netlify":
      return [
        `server: Netlify response header on ${domain}`,
        `x-nf-request-id present`,
        `netlify edge function invocation observed`,
      ];
    case "vercel":
      return [
        `server: Vercel response header on ${domain}`,
        `x-vercel-id: iad1 edge region observed`,
        `x-vercel-cache: HIT on static assets`,
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
  const { domain, name } = parseDomain(url);
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
      warnings: category === "generic" ? ["Limited structured data detected, using safe defaults"] : [],
    },
    tools,
    detectedCdn,
    activationStatus: "idle",
    createdAt: Date.now(),
  };
}

export function categoryLabel(c: SiteCategory): string {
  return c.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
