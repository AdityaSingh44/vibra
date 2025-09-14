# Vibra — a privacy-first social platform (Node.js + React)

Vibra is a modern social media platform prototype built with a Node.js backend and a ReactJS frontend. Its mission is to deliver meaningful, healthy online communities by prioritizing privacy, transparency, and fair creator monetization while avoiding attention-exploiting algorithms and ad-driven incentives.

This README documents the project's vision, key features, how Vibra differs from current mainstream social platforms, a suggested tech stack and architecture, and practical setup instructions for local development.

## Vision

Vibra aims to be a sustainable social platform that:

- Respects user privacy and gives users control over their data.
- Makes algorithmic choices transparent and opt-in.
- Encourages high-quality interactions through community-first design and moderation tools.
- Provides fair and optional monetization paths for creators that do not rely on invasive advertising.

## Key Features

- Profiles: lightweight user profiles with privacy controls and exportable data.
- Feed Modes: multiple feed modes (chronological, community-curated, opt-in recommendations) — users choose what drives their feed.
- Communities & Topics: first-class community spaces with per-community moderation rules.
- Long-form + Short-form: support for both short updates and long-form posts with threading and rich text.
- Privacy Controls: per-post visibility, audience selectors, and data export tools (download your data).
- Algorithm Transparency: clear explanations of recommendation signals; option to disable recommendations entirely.
- Creator Tools: subscription & tipping options, content gating, and analytics that prioritize meaningful metrics (engagement quality over time spent).
- Safety & Moderation: community moderation tooling, reporting flows, and configurable moderation policies.
- Realtime Interactions: live comments, reactions, and presence indicators (opt-in).

## How Vibra Is Different

Below are the main ways Vibra intends to be different from mainstream social platforms:

- Privacy-first defaults: Unlike platforms that collect broad cross-service behavioral data, Vibra's default is minimal data collection and clear consent paths for any tracking or profiling.
- User choice over algorithms: Instead of a single opaque feed ranking, users explicitly pick a feed mode. Recommendations are explainable and can be fully turned off.
- No ad-first incentives: The platform supports optional creator subscriptions and micro-payments rather than ad-driven growth that optimizes for engagement time and sensational content.
- Community empowerment: Tools for communities (moderation helpers, transparent moderation logs, community-elected moderators) reduce central moderation load and increase local norms.
- Data portability and ownership: Users can export their content and connections in a machine-readable format to move or archive their presence.
- Quality-focused metrics: Analytics and ranking signals favor sustained constructive interaction and relevance, not just clicks or session length.

These differentiators are design principles. Realizing them in production requires careful engineering, governance, and business model choices.

## Recommended Tech Stack (suggested)

- Backend: Node.js (LTS) with Express or Fastify for REST / GraphQL (Apollo) for flexible APIs.
- Database: MongoDB for primary data; Redis for caching and rate-limiting.
- Realtime: WebSockets or Socket.IO for live updates.
- Authentication: JWT + refresh tokens (or sessions), with optional WebAuthn for passwordless login.
- Frontend: React (Create React App / Vite), React Router, and modern state management (React Query / Zustand).
- Storage: S3-compatible object storage for media; use signed URLs for uploads.
- DevOps: Docker + docker-compose for local development; CI pipeline for lint/test/build.

Notes: This repo uses Node.js + React as requested; the exact frameworks (Express vs Fastify, REST vs GraphQL) can be chosen during implementation.

## Suggested Architecture

- Client (React): UI, client-side routing, secure API calls to backend, optimistic updates for good UX.
- API Server (Node.js): authentication, user/profile management, posts, communities, moderation endpoints, subscriptions/payments, and media pre-signed upload endpoints.
- Worker(s): background jobs for notifications, digest generation, moderation queue processing, and analytics.
- Message Bus: optional (Kafka / Redis Streams) for decoupling high-throughput events.

## Local Development (example)

The repository is expected to be split into `client/` (React) and `server/` (Node.js) directories. If you follow that structure, the steps below will help you run both locally.

Windows PowerShell example (from repository root):

1. Install dependencies for server and client

```powershell
# from project root
cd server; npm install; cd ..
cd client; npm install; cd ..
```

2. Run services locally (example using npm scripts)

```powershell
# Start backend (in one terminal)
cd server; npm run dev

# Start frontend (in another terminal)
cd client; npm run dev
```

3. Environment variables (example `.env` in `server/`)

```
PORT=4000
DATABASE_URL=mongodb://user:pass@localhost:27017/vibra
JWT_SECRET=changeme
S3_ENDPOINT=
S3_BUCKET=
```

4. Optional: run with Docker

```powershell
# from project root
docker-compose up --build
```

These commands are templates — adjust to match your chosen frameworks, package manager, and scripts.

### Example npm scripts and recommended project layout

Suggested repo layout:

```
/client    # React app (Vite or CRA)
/server    # Node.js API
docker-compose.yml
README.md
```

Add these example `package.json` scripts:

- In `server/package.json`:

```
"scripts": {
	"dev": "nodemon --watch src --exec ts-node src/index.ts",
	"start": "node dist/index.js",
	"build": "tsc",
	"test": "jest"
}
```

- In `client/package.json` (Vite example):

```
"scripts": {
	"dev": "vite",
	"build": "vite build",
	"preview": "vite preview",
	"test": "vitest"
}
```

### Example `docker-compose.yml` (minimal)

```yaml
version: '3.8'
services:
	db:
		image: mongo:6.0
		environment:
			MONGO_INITDB_DATABASE: vibra
			MONGO_INITDB_ROOT_USERNAME: vibra
			MONGO_INITDB_ROOT_PASSWORD: vibra
		volumes:
			- db-data:/data/db

	server:
		build: ./server
		command: npm run dev
		environment:
			DATABASE_URL: mongodb://vibra:vibra@db:27017/vibra
		depends_on:
			- db
		ports:
			- "4000:4000"

	client:
		build: ./client
		command: npm run dev
		ports:
			- "3000:3000"
		depends_on:
			- server

volumes:
	db-data:
```

These snippets are starting points you can adapt to your preferred build toolchain and Docker configuration.

## Minimal API & UX Priorities (MVP)

Core things to build first:

- User registration & login (with email verification)
- Basic profiles and follow graph
- Create/read/update/delete posts (text + images)
- Community creation and join flows
- Chronological feed and per-community feed
- Reporting and moderation pipeline

Optional next-phase features:

- Opt-in recommendations and discovery
- Creator monetization (subscriptions, tipping)
- Data export / portability tools

## Roadmap and Governance

- Phase 1 (MVP): privacy-safe signup, profiles, posts, communities, basic moderation.
- Phase 2: creator tools, subscription payments, algorithm transparency features.
- Phase 3: federation/portability, advanced moderation tooling, governance model (community councils or elected moderators).

Governance note: platform rules, moderation policies, and monetization should be decided with community input. Vibra favors transparent policies and community feedback loops.

## Contributing

If you'd like to contribute:

1. Fork the repo and create a feature branch.
2. Write tests for new behavior and run the test suite.
3. Open a pull request with a clear description of the change.

Please follow standard formatting and linting rules. Add an entry to `CHANGELOG.md` for larger changes.

## Security and Privacy Considerations

- Minimize data collection and store only essential user data.
- Encrypt sensitive data at rest and in transit (TLS everywhere).
- Rate limit endpoints and protect upload endpoints with signed URLs.
- Provide a clear privacy policy describing what data is stored and how it is used.

## Design & Ethical Considerations

Vibra's value comes from design choices more than features: avoiding attention-harvesting incentives, giving users meaningful control, and building tools that encourage constructive participation.

When reviewing or implementing features, ask: "Does this increase meaningful interactions or merely capture attention?" Prefer decisions that benefit long-term community health.

## Contact & Next Steps

This README is a starting point. If you'd like, I can:

- Generate an initial `server/` and `client/` scaffold (Express + Vite) with authentication and a simple posts API.
- Add Docker and docker-compose configs for local orchestration.
- Draft a contributor code of conduct and governance proposal.

If you want me to scaffold the project now, tell me which subfolders you prefer (`server/` and `client/` are suggested) and whether you prefer REST or GraphQL for the API.

---

Last updated: 2025-09-14

## Requirements → Implementation Mapping

This section maps the key product requirements to concrete implementation tasks for an initial development effort.

- Privacy-first defaults
	- Tasks: Minimize stored user metadata; build consent screens; implement limited logging and retention policies.
	- Files/areas: `server/src/auth/*`, `server/src/privacy/*`, DB schema with minimal PII.

- User choice over algorithms
	- Tasks: Implement multiple feed endpoints and client toggle state; document ranking signals.
	- Files/areas: `server/src/feeds/*`, `client/src/feeds/*`.

- No ad-first incentives
	- Tasks: Add subscription/tip endpoints; delay or omit ad-services integration.
	- Files/areas: `server/src/payments/*`, `client/src/payments/*`.

- Community empowerment & moderation
	- Tasks: Community model + roles; moderation queue; moderator actions API.
	- Files/areas: `server/src/communities/*`, `server/src/moderation/*`, `client/src/admin/*`.

- Data portability
	- Tasks: Export endpoints; background job to compile user archives (JSON/zip).
	- Files/areas: `server/src/export/*`.

## Quality Gates (quick triage checklist)

Before merging major changes, run this quick gate:

1. Build: `server` and `client` both build without errors. (PASS/FAIL)
2. Lint/Typecheck: Run ESLint / TypeScript checks. (PASS/FAIL)
3. Unit tests: Core unit tests for auth and post creation pass. (PASS/FAIL)
4. Smoke test: Start dev servers and perform a simple registration + post creation. (PASS/FAIL)

When implementing features I can scaffold test cases and CI steps to automate these gates.

---

Final status: initial README drafted and local setup + mapping added. All todos completed.
