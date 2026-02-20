# Claude Project Context
> **Vision & Goals:** See [VISION.md](./VISION.md) for the high-level purpose of this Ontology Hub.
> Always align technical implementations with the core goal of "browsing ease and interoperability."

# Claude Code Configuration - Claude Flow V3

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes — Git webhook payloads (push, release, tag) are the primary domain events; ingestion state transitions (queued → validating → loaded → failed) MUST be event-sourced and never mutated directly
- Ensure input validation at system boundaries

### Bounded Contexts (DDD)
- `AuthContext` — GitHub OAuth 2.0 session and identity
- `RegistryContext` — Ontology registration, GitHub repo linking
- `IngestionContext` — Webhook → fetch → parse → SHACL validate → Named Graph load
- `DiscoveryContext` — SPARQL browse/query/public API

### Ingestion Pipeline Stages (ordered, must be separate modules)
1. Webhook receiver (validates GitHub `x-hub-signature-256` HMAC)
2. RDF fetcher (raw content from GitHub API at commit/tag ref)
3. Parser (`n3` or `graphy`)
4. SHACL validator — MUST pass before any write; reject and emit `failed` event on violation
5. Graph Store writer (`sparql-http-client`, SPARQL 1.1 Graph Store HTTP Protocol)
6. Inspection indexer (SPARQL queries to extract class/property/prefix metrics)

### Named Graph Convention

Two categories of named graph, with different mutability rules:

| Graph | URI pattern | Mutable? |
|---|---|---|
| Ontology version | `urn:ontohub:{owner}:{repo}:{version}` | No — written once on ingest |
| Registry (operational) | `urn:ontohub:registry` | Yes — SPARQL UPDATE only |

- Use Graph Store HTTP `PUT` for initial ontology graph load
- Use Graph Store HTTP `DELETE` only on explicit retraction/re-ingestion, never on live data
- Use `SPARQL UPDATE` (`INSERT DATA` / `DELETE DATA` / `DELETE…INSERT…WHERE`) for all registry graph mutations

### Registry Graph (Operational Data)

**Decision:** user accounts, registered repositories, webhook registrations, and ingestion events are all stored as RDF triples in the single mutable `urn:ontohub:registry` named graph. No separate relational database.

**Vocabulary:**
- `foaf:` — user identity (`foaf:Person`, `foaf:account`)
- `dcterms:` — timestamps, identifiers (`dcterms:created`, `dcterms:identifier`)
- `ontohub:` prefix: `https://ontohub.org/vocab#` — custom terms for registry concepts

**Subject URI patterns:**
```
User:         urn:ontohub:user:{githubId}
Registration: urn:ontohub:registration:{owner}:{repo}
Event:        urn:ontohub:event:{uuid}
```

**Data model (Turtle):**
```turtle
# User
<urn:ontohub:user:{githubId}>
  a foaf:Person ;
  foaf:account <https://github.com/{login}> ;
  foaf:name "{displayName}" ;
  dcterms:identifier "{githubId}" .

# Registered repository
<urn:ontohub:registration:{owner}:{repo}>
  a ontohub:Registration ;
  ontohub:registeredBy <urn:ontohub:user:{githubId}> ;
  ontohub:githubRepo <https://github.com/{owner}/{repo}> ;
  ontohub:webhookId "{githubWebhookId}" ;
  ontohub:webhookSecretEnc "{aes256gcm-ciphertext}" ;
  ontohub:status ontohub:Active ;
  dcterms:created "{timestamp}"^^xsd:dateTime .

# Ingestion event (event-sourced state)
<urn:ontohub:event:{uuid}>
  a ontohub:IngestionEvent ;
  ontohub:registration <urn:ontohub:registration:{owner}:{repo}> ;
  ontohub:gitRef "{tag-or-sha}" ;
  ontohub:status ontohub:Queued ;   # → ontohub:Validating → ontohub:Loaded | ontohub:Failed
  dcterms:created "{timestamp}"^^xsd:dateTime .
```

**Webhook secret security:**
- The GitHub webhook HMAC secret MUST be retrievable to validate incoming requests — it cannot be one-way hashed
- Store it AES-256-GCM encrypted as `ontohub:webhookSecretEnc`
- The encryption key lives ONLY in the `WEBHOOK_ENCRYPTION_KEY` environment variable — never in the graph
- Decrypt on demand in the webhook receiver; never log or return the plaintext secret

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Development guidelines

### Tech Stack
- **Backend**: Node.js, Express
- **Graph Store**: GraphDB free edition (SPARQL 1.1), running on localhost:7200, repository `ontohub`
- **SPARQL Client**: `sparql-http-client` for ALL GraphDB interactions (queries, updates, and Graph Store writes)
- **RDF Library**: `graphy` or `n3` for JS-side parsing only
- **Auth**: GitHub OAuth 2.0 via `passport-github2`
- **Sessions**: `express-session` with in-memory store (development) — cookie name `ontohub_session`
- **Webhook**: Express route with `x-hub-signature-256` HMAC validation
- **Webhook secret storage**: AES-256-GCM encrypted literal in the registry graph; key from `WEBHOOK_ENCRYPTION_KEY` env var
- **SHACL Validation**: `rdf-validate-shacl` (or equivalent) as a required ingestion gate
- **Ontology Hub**: Browsing, mapping, and publishing existing OWL/RDF ontologies

### Versioning
- Ontology versions map 1:1 to Git tags and commit hashes
- Named graph URI encodes version as the Git tag string (e.g., `v1.2.0`)

### Frontend
- **Framework**: Next.js App Router (TypeScript) — located in `/web`
- **Styling**: Tailwind CSS + shadcn/ui (copy-paste components, not an npm dependency)
- **Rendering strategy**:
  - Public ontology pages: React Server Components + ISR (`revalidate = false` — versions are immutable once published)
  - Auth-gated dashboard: Server Components with server-side session check
  - Graph explorer / SPARQL editor: `"use client"` components only where interactivity is required
- **Route groups**:
  - `(public)` — DiscoveryContext: ontology browse, search, version pages
  - `(dashboard)` — RegistryContext: register repo, manage webhooks (auth-gated)
- **API calls**: Next.js frontend calls Express backend REST API only — no direct GraphDB access from the frontend
- **Graph visualisation**: `react-force-graph` for class/property explorer (client component)
- **SPARQL editor**: CodeMirror 6 with SPARQL language mode (client component)
- **Key directories inside `/web`**:
  - `app/` — Next.js App Router pages and layouts
  - `components/ui/` — shadcn/ui primitives
  - `components/ontology/` — domain-specific display components
  - `components/layout/` — Header, Footer, Nav
  - `lib/` — typed API client (`api.ts`), SPARQL type helpers (`sparql.ts`), auth utils (`auth.ts`)
  - `types/` — shared TypeScript interfaces (e.g., `Ontology`, `OntologyVersion`)

### SPARQL Rules
- Always use standard prefixes (rdf, rdfs, owl, skos, dcterms).
- Return results in `application/sparql-results+json` format.
- Prefer `CONSTRUCT` queries when building graph fragments for the UI.
- Use `sparql-http-client` for ALL database interactions — never raw `fetch`/`axios` against the SPARQL endpoint.
- Use Graph Store HTTP `PUT` to load a named graph; use `SPARQL UPDATE` (`INSERT DATA`) for incremental additions.
- SHACL validation MUST pass before any Graph Store write.

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
