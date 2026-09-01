# AutoWebMCP

Build a beautiful, premium, investor-demo-quality web app called “Satsuma Auto WebMCP”.

This is a polished product demo. It should feel like the user can paste any website URL, scan the site, generate WebMCP tools, and activate them through an edge provider. The demo can use simulated scanning and simulated activation flows, but it must feel real, detailed, and believable.

Product positioning:

“Make your website agent-ready in 60 seconds.”

“Auto WebMCP scans your website, discovers agent-callable actions, generates WebMCP tools, and activates them at the edge through Cloudflare, Akamai, Fastly, HUMAN, or DataDome.”

“Agents stop guessing at pixels. They get safe, structured tools.”

Design style:

- Sexy, modern, dark, premium developer product.

- Think Linear + Vercel + Cloudflare dashboard.

- Dark background with subtle gradients, glass cards, soft borders, glowing scan animations, code panels, provider cards, status pills, progress timelines, and beautiful empty states.

- Use React, TypeScript, Tailwind, shadcn/ui.

- Make it feel fast, magical, and credible.

- Do not make it look like a generic SaaS template.

Important demo behavior:

- The app should have a real URL input.

- When the user enters a URL and clicks “Generate WebMCP”, run a believable multi-step scanning animation.

- The scanner should appear to:

  1. Fetch the homepage

  2. Crawl key pages

  3. Inspect forms

  4. Analyze buttons and CTAs

  5. Detect API-like actions

  6. Ask an LLM to infer tool intent

  7. Generate JSON Schemas

  8. Build WebMCP registration code

  9. Prepare edge activation

- The output should be believable tools based on the URL/domain/content.

- If a real LLM API key is configured, use it to generate tools from the URL, homepage title, meta description, and visible text.

- If no LLM key is configured, use deterministic demo generation based on the domain and website category.

App flow:

Page 1: Landing page

Hero:

Headline: “Turn any website into an agent-ready website.”

Subheadline: “Paste a URL. Auto WebMCP scans your site, generates structured tools, and activates them at the edge so AI agents can safely use your website.”

Primary input: URL field with placeholder “https://your-site.com”

CTA: “Generate WebMCP”

Secondary CTA: “Watch demo”

Hero visual:

- Animated browser window showing a site being scanned.

- Floating tool cards:

  - search_products

  - submit_contact_form

  - book_appointment

  - check_order_status

  - create_support_ticket

- Code snippet showing:

  navigator.modelContext.registerTool({

    name: "book_appointment",

    description: "Book an appointment from available times",

    inputSchema: { ... }

  })

Trust strip:

“Works with your existing edge stack”

Provider logos/cards:

- Cloudflare Workers

- Akamai EdgeWorkers

- Fastly Compute / VCL

- HUMAN Enforcer

- DataDome Edge Module

Use correct provider wording:

Cloudflare: “Activate with a Cloudflare Worker”

Akamai: “Deploy as an Akamai EdgeWorker”

Fastly: “Publish as Fastly Compute or VCL”

HUMAN: “Attach through HUMAN Enforcer”

DataDome: “Attach through DataDome Edge Module”

Page 2: Scan experience

After URL submission, navigate to /scan.

Show:

- Large title: “Scanning {domain}”

- Subtitle: “Discovering actions agents can safely call.”

- Live progress timeline with animated steps.

- Each step should complete with realistic logs.

Example logs:

[00:01] Resolving origin and edge configuration

[00:03] Fetching homepage HTML

[00:05] Extracting forms, buttons, links, and structured data

[00:07] Classifying user journeys

[00:10] Inferring agent-safe actions

[00:12] Generating WebMCP tool schemas

[00:15] Preparing edge activation bundle

Add a live “site intelligence” panel:

- Site category

- Primary conversion goal

- Detected forms

- Detected CTAs

- Detected agent opportunities

- Risk level

Make this dynamic by URL:

- ecommerce domains should generate product/search/cart/order tools

- restaurant domains should generate reservation/catering/menu tools

- SaaS domains should generate demo/contact/support/docs tools

- healthcare/dental/clinic domains should generate appointment/location/intake tools

- real estate domains should generate property_search/schedule_tour/contact_agent tools

- generic domains should generate contact/search/newsletter/request_quote tools

LLM integration:

Create an edge function called analyze-site.

Input:

{

  "url": "https://example.com",

  "demoMode": true

}

Behavior:

- Try to fetch the target URL server-side.

- Extract title, meta description, h1s, visible text sample, forms if available.

- Send the sanitized site summary to an LLM if OPENAI_API_KEY exists.

- Ask the LLM to return believable WebMCP tools.

- If fetch or LLM fails, return high-quality simulated tools based on the domain and inferred category.

- Never block the demo because a site fails to load.

LLM system prompt:

You are generating a product demo for Auto WebMCP. Given a website URL and limited page content, infer believable agent-callable website actions. Do not invent private APIs. Generate tools that could reasonably exist from visible website features, forms, CTAs, navigation, or common user journeys for that kind of site. Return structured JSON only.

LLM output schema:

{

  "site": {

    "domain": "string",

    "name": "string",

    "category": "ecommerce | restaurant | saas | healthcare | real_estate | marketplace | media | nonprofit | generic",

    "summary": "string",

    "primaryGoal": "string"

  },

  "scan": {

    "formsFound": number,

    "ctasFound": number,

    "apiCandidates": number,

    "confidence": number,

    "warnings": ["string"]

  },

  "tools": [

    {

      "name": "snake_case",

      "label": "Human readable label",

      "description": "Clear description for an AI agent",

      "type": "form | navigation | search | transaction | support | booking | account | content",

      "method": "GET | POST",

      "path": "/example",

      "safety": "safe | confirmation_required | sensitive",

      "confidence": number,

      "inputSchema": {

        "type": "object",

        "properties": {},

        "required": []

      },

      "examplePrompt": "string"

    }

  ]

}

Page 3: Generated WebMCP page

After scan finishes, navigate to /generated.

Top section:

- “WebMCP generated for {domain}”

- Status pill: “Ready to activate”

- Metrics:

  - Tools generated

  - Forms mapped

  - Agent actions exposed

  - Estimated setup time: “Under 2 minutes”

Main layout:

Left side: Tool list

Right side: Selected tool details

Each tool card:

- Tool name

- Description

- Safety badge

- Confidence badge

- Example agent prompt

- Toggle: enabled / disabled

Tool detail panel:

- JSON Schema viewer

- Generated WebMCP code preview

- Request mapping preview

- Agent preview

Generated code preview:

Show polished code that looks real:

await navigator.modelContext.registerTool({

  name: "submit_contact_request",

  description: "Submit a contact request from the website contact form.",

  inputSchema: {

    type: "object",

    properties: {

      name: { type: "string" },

      email: { type: "string", format: "email" },

      message: { type: "string" }

    },

    required: ["name", "email", "message"]

  },

  annotations: {

    readOnlyHint: false,

    destructiveHint: false

  }

}, async (input) => {

  return await window.__autoWebMCP.invoke("submit_contact_request", input);

});

Important:

Use “WebMCP generated” language.

Do not overclaim that the real website has been modified yet.

Say “Ready to activate” before provider activation.

Agent preview:

Show a chat-style preview:

Agent:

“Can you book an appointment for next Tuesday afternoon?”

Auto WebMCP:

“Using book_appointment from {domain}.”

Result:

“Appointment request submitted. Confirmation required from the site.”

Page 4: Activation page

Title:

“Activate Auto WebMCP at the edge”

Subtitle:

“Choose how Auto WebMCP should be attached to your existing traffic path.”

Provider cards:

1. Cloudflare Workers

Description:

“Deploy a lightweight Worker that injects the Auto WebMCP layer and exposes generated tools in the browser context.”

CTA: “Activate Worker”

Status after click: “Worker deployed”

Fake deployment URL:

https://{domain-slug}-webmcp.workers.dev

2. Akamai EdgeWorkers

Description:

“Package the WebMCP layer as an Akamai EdgeWorker and attach it to your property configuration.”

CTA: “Create EdgeWorker bundle”

Status after click: “EdgeWorker bundle ready”

3. Fastly Compute / VCL

Description:

“Publish the WebMCP layer through Fastly Compute or attach it with a VCL snippet for edge-side injection.”

CTA: “Generate Fastly package”

Status after click: “Fastly package ready”

4. HUMAN Enforcer

Description:

“Attach Auto WebMCP through your HUMAN Enforcer deployment path, alongside existing bot and fraud controls.”

CTA: “Prepare HUMAN config”

Status after click: “Enforcer config ready”

5. DataDome Edge Module

Description:

“Attach Auto WebMCP through your DataDome edge module using Cloudflare Worker, Akamai EdgeWorker, Fastly VCL, or Fastly Compute patterns.”

CTA: “Prepare DataDome config”

Status after click: “Edge module config ready”

Activation behavior:

- Clicking any provider starts a realistic activation modal.

- Show steps:

  1. Building WebMCP bundle

  2. Generating provider config

  3. Validating headers and CSP

  4. Preparing edge injection

  5. Running health check

  6. Activation complete

- The activation should finish successfully in demo mode.

- Show a final success state.

Final success screen:

Headline:

“{domain} is now agent-ready.”

Show:

- Activated provider

- Generated tools

- Agent entry URL

- Copy install snippet

- Download bundle button

- “Open agent preview” button

Agent entry URL:

Use a realistic demo URL, not a fake claim that the real domain changed:

https://agent-preview.autowebmcp.demo/{domain-slug}

Copy snippet:

<script src="https://cdn.autowebmcp.com/v1/auto-webmcp.js" data-site="{domain}"></script>

For Cloudflare copy:

“Install as Worker route”

Route:

{domain}/*

For Akamai copy:

“Attach EdgeWorker to property rule”

For Fastly copy:

“Add Compute service or VCL recv/deliver snippet”

For HUMAN copy:

“Add Auto WebMCP as an Enforcer-side companion snippet”

For DataDome copy:

“Attach alongside the DataDome edge module and client-side tag”

Page 5: Agent preview

Show a simulated agent visiting the site and discovering tools.

Layout:

- Browser preview on left

- Agent console on right

- Tool inspector drawer at bottom

Agent console:

“Visiting {domain}...”

“Discovered 6 WebMCP tools.”

“Calling search_products...”

“Calling submit_contact_request...”

“Action completed with confirmation required.”

Tool inspector:

List tools with schemas and badges.

Make it feel like the agent can interact with the website through structured tools instead of clicking around.

Important disclaimers, but keep them subtle:

- Footer text: “Demo mode simulates activation unless provider credentials are connected.”

- In Settings, show “Provider credentials not connected” unless env vars are present.

- Do not put scary disclaimers in the hero.

Settings page:

Show integration status:

- OpenAI: connected / not connected

- Cloudflare: connected / not connected

- Akamai: connected / not connected

- Fastly: connected / not connected

- HUMAN: connected / not connected

- DataDome: connected / not connected

Environment variables:

OPENAI_API_KEY optional

CLOUDFLARE_API_TOKEN optional

CLOUDFLARE_ACCOUNT_ID optional

AKAMAI_CLIENT_TOKEN optional

AKAMAI_CLIENT_SECRET optional

AKAMAI_ACCESS_TOKEN optional

FASTLY_API_TOKEN optional

HUMAN_API_KEY optional

DATADOME_API_KEY optional

If keys are missing:

- Still run demo mode.

- Clearly show “Demo activation” inside the Settings page.

- The main flow should still feel complete.

Data model:

projects:

- id

- url

- domain

- site_name

- category

- status

- scan_result json

- tools json

- selected_provider

- activation_status

- preview_url

- created_at

Frontend state is enough for MVP, but use Supabase if available.

Interactions:

- URL input must validate http and https.

- Show polished loading states.

- Generate at least 4 tools and at most 9 tools.

- Every tool must have:

  - name

  - label

  - description

  - safety

  - confidence

  - inputSchema

  - examplePrompt

- Make the tool names believable and specific to the target site.

- For a site like doordash.com, generate tools like search_restaurants, check_delivery_availability, browse_menu, start_group_order.

- For a site like calendly.com, generate tools like find_available_times, schedule_meeting, reschedule_booking.

- For a site like zillow.com, generate tools like search_properties, estimate_home_value, schedule_tour, contact_agent.

- For a site like a dental clinic, generate tools like request_appointment, find_location, submit_new_patient_inquiry.

- For a SaaS website, generate request_demo, contact_sales, search_docs, create_support_ticket.

Visual polish requirements:

- Use animated progress bars.

- Use skeleton loaders.

- Use confetti or subtle glow on successful activation.

- Use a generated “WebMCP manifest” code block.

- Use provider-specific icons or tasteful placeholder logos.

- Use monospace code panels.

- Use green status pills for active, amber for confirmation_required, blue for generated, purple for LLM inferred.

Copywriting:

Use these phrases throughout:

- “Agent-ready”

- “Structured tools”

- “Edge activation”

- “WebMCP manifest”

- “LLM-inferred actions”

- “Safe actuation”

- “Confirmation required”

- “Existing edge stack”

- “No origin rewrite required”

- “Deploy through your CDN, bot defense, or edge security provider”

Do not use these phrases:

- “Fake”

- “Mock”

- “Pretend”

- “Not real”

Instead use:

- “Demo mode”

- “Preview activation”

- “Generated package”

- “Ready to connect credentials”

Acceptance criteria:

1. User can paste any URL.

2. App shows a beautiful scanning flow.

3. App uses LLM if available to generate believable tools.

4. App falls back to deterministic demo tools if LLM is unavailable.

5. App shows a generated WebMCP manifest and registerTool code.

6. App lets user toggle tools on and off.

7. App has activation options for Cloudflare, Akamai, Fastly, HUMAN, and DataDome.

8. Provider wording must be technically credible:

   - Cloudflare Worker

   - Akamai EdgeWorker

   - Fastly Compute / VCL

   - HUMAN Enforcer

   - DataDome Edge Module

9. Activation flow completes in demo mode.

10. Final screen says the site is agent-ready and gives an agent preview URL.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://autowebmcp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1a708380-1954-40be-ae9d-0ba7cf0e4f9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
