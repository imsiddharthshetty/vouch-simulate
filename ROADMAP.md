# Vouch Simulate — Product & Implementation Roadmap

## Cathedral Vision

Vouch Simulate is not a stress-testing tool. It is the **staging environment, CI/CD pipeline, and continuous monitoring system for programmable money.** Every government, institution, and enterprise deploying conditional value transfers will need to prove their program works before they deploy it — and monitor it after. Vouch Simulate is where that happens.

The data flywheel is the moat: every simulation run makes calibration better, benchmarks richer, and failure mode detection more comprehensive. Competitors without the flywheel can never match the output quality.

---

## Architecture Foundation

### Two-Layer Simulation Engine

```
  Layer 1 — Deterministic Engine (no LLM)
  ├── Program rules, asset flows, ledger accounting
  ├── Conservation laws (issued = redeemed + leaked + slashed + unredeemed)
  ├── Constraint validation (rejects invalid agent actions)
  └── State transitions (deterministic given same seed)

  Layer 2 — Agent Decision Layer (LLM-assisted)
  ├── 30+ agent types across 8 factions
  ├── Each agent has: utility function, constraints, strategy space
  ├── LLM proposes actions; Layer 1 validates
  └── Cache identical state→action pairs to reduce LLM costs
```

### Key Architectural Decisions

1. **Isomorphic TypeScript library (`@vouch/simulate-engine`)** — The deterministic engine is a standalone package that runs in both browser (Phase 1) and server (Phase 2+). No rewrite between phases.

2. **LLM-primary with caching** — LLM decides all agent actions (preserving emergent behavior), but identical state hashes return cached decisions. Heuristic fallbacks for LLM failures only.

3. **Structured condition builder** — User input parsed into structured IF/THEN/AND/OR rules before touching the engine or LLM. Natural language accepted as input UX, but converted to structured format. Eliminates prompt injection vector.

4. **Engine versioning from day 1** — Every simulation result tagged with engine version. Old results remain valid. Delta comparisons across engine versions show warnings.

### System Architecture

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        VOUCH SIMULATE PLATFORM                             │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
  │  │  WEB CLIENT  │  │  DASHBOARD   │  │  EMBED SDK   │  │  CLI / API    │   │
  │  │  (Phase 1)   │  │  (Phase 2)   │  │  (Phase 4)   │  │  (Phase 3)    │   │
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘   │
  │         │                 │                  │                  │            │
  │  ┌──────▼─────────────────▼──────────────────▼──────────────────▼────────┐  │
  │  │                      API GATEWAY (Next.js App Router)                 │  │
  │  │   Auth │ Rate Limit │ Tenant Isolation │ Request Routing              │  │
  │  └──────┬───────────────────┬────────────────────┬──────────────────────┘  │
  │         │                   │                    │                          │
  │  ┌──────▼───────┐   ┌──────▼────────┐   ┌──────▼──────────────────────┐   │
  │  │  SIMULATION   │   │  ANALYTICS    │   │  PLATFORM SERVICES          │   │
  │  │  ENGINE CORE  │   │  & REPORTING  │   │                             │   │
  │  │               │   │               │   │  Template Marketplace (P4)  │   │
  │  │  Deterministic│   │  Aggregation  │   │  Continuous Monitor (P5)    │   │
  │  │  Engine (L1)  │   │  Benchmarks   │   │  Red Team Service (P5)     │   │
  │  │               │   │  Sensitivity  │   │  Regulatory Workflow (P4)  │   │
  │  │  Agent Layer  │   │  PDF Export   │   │  Collaboration (P3)        │   │
  │  │  (L2 - LLM)  │   │  Delta Engine │   │                             │   │
  │  │               │   │               │   └─────────────────────────────┘   │
  │  │  Monte Carlo  │   └───────────────┘                                     │
  │  │  Orchestrator │                                                          │
  │  └──────┬───────┘                                                          │
  │         │                                                                   │
  │  ┌──────▼──────────────────────────────────────────────────────────────┐   │
  │  │                     INFRASTRUCTURE LAYER                            │   │
  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │   │
  │  │  │ BullMQ   │  │ Postgres │  │ Redis    │  │ LLM Gateway        │  │   │
  │  │  │ Job Queue│  │          │  │ Cache +  │  │ Claude API         │  │   │
  │  │  │          │  │          │  │ PubSub   │  │ w/ cache layer     │  │   │
  │  │  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │   │
  │  │  ┌──────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │   │
  │  │  │ Calibration Data │  │ Benchmark Data     │  │ Audit Store     │  │   │
  │  │  │ Pipeline (P3)    │  │ Warehouse (P3)     │  │ Immutable (P3)  │  │   │
  │  │  └──────────────────┘  └───────────────────┘  └─────────────────┘  │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
  @vouch/simulate-engine/          <-- Isomorphic TS library
  ├── src/
  │   ├── core/
  │   │   ├── engine.ts            State model, time step loop, conservation
  │   │   ├── state.ts             Type definitions: ledger, agent, system, event
  │   │   ├── conservation.ts      Conservation law enforcement
  │   │   ├── constraints.ts       Constraint validation
  │   │   └── transitions.ts       State transition logic
  │   ├── agents/
  │   │   ├── types.ts             Agent type definitions + utility functions
  │   │   ├── resolver.ts          Agent decision resolution (cache -> LLM)
  │   │   ├── heuristics/          Fallback solvers per agent type
  │   │   └── factions/            Faction-specific agent configs
  │   ├── sampling/
  │   │   ├── distributions.ts     Beta, Bernoulli, Poisson, Pareto
  │   │   ├── sampler.ts           Parameter vector sampling
  │   │   └── seeds.ts             Seed management for reproducibility
  │   ├── monte-carlo/
  │   │   ├── orchestrator.ts      Run dispatching + collection
  │   │   ├── aggregator.ts        Distribution statistics computation
  │   │   └── validator.ts         Post-run validation
  │   ├── context/
  │   │   ├── assets.ts            Asset type catalog + oracle mappings
  │   │   ├── countries.ts         Country/region parameter defaults
  │   │   └── programs.ts          Program type defaults + faction mappings
  │   └── index.ts                 Public API
  │
  apps/web/                        <-- Next.js 14 App Router
  ├── app/
  │   ├── simulate/
  │   │   ├── configure/page.tsx   Screen 1: Config
  │   │   ├── running/page.tsx     Screen 2: Progress
  │   │   ├── results/page.tsx     Screen 3: Results + delta
  │   │   └── replay/page.tsx      Simulation replay viewer
  │   └── api/
  │       ├── simulate/route.ts    Simulation trigger
  │       ├── progress/route.ts    SSE endpoint
  │       └── export/route.ts      PDF export
  ├── lib/
  │   ├── llm/
  │   │   ├── gateway.ts           LLM client with retry/fallback
  │   │   ├── cache.ts             Agent decision cache
  │   │   └── prompts/             Versioned prompt templates
  │   ├── jobs/
  │   │   ├── simulation.job.ts    BullMQ job definition
  │   │   └── worker.ts            BullMQ worker
  │   └── db/
  │       ├── schema.ts            DB schema
  │       └── queries.ts           Query layer
  └── components/
      ├── config/                  Config form + condition builder
      ├── progress/                Progress UI
      ├── results/                 Results dashboard
      ├── replay/                  Simulation replay viewer
      └── charts/                  Distribution visualization
```

---

## Phase 1: Foundation (Weeks 1-3)

**Theme:** "The engine exists and proves the concept"

### Deliverables

#### 1.1 `@vouch/simulate-engine` — Isomorphic TypeScript Library
- Deterministic engine: state model, conservation laws, constraint validation, time step loop (5 steps)
- Parameter sampler: Beta, Bernoulli, Poisson, Pareto distributions
- Seed-based reproducibility (same seed = identical run)
- 12 core agent types (1 representative per faction) with formal utility functions
- Validation layer: conservation check, metric normalization, logical consistency

#### 1.2 Browser Artifact — React SPA
- **Screen 1: Program Configuration**
  - Asset type selector (card grid, 7 options + custom)
  - Country + region (sequential searchable dropdowns)
  - Program type (5 options, updates default factions)
  - Structured condition builder (visual IF/THEN/AND/OR rules)
  - Natural language input option (parsed to structured rules via LLM)
  - Program parameters: name, cap, per-beneficiary limit, oracle type, redemption window, slashing conditions, dispute resolution, catastrophic failure threshold
  - Simulation mode: Quick Scan only (Full Simulation stubbed with "coming soon")
  - Stress scenarios: multi-select card grid
  - Population size, active factions, adversary intensity
- **Screen 2: Simulation in Progress**
  - Live activity log streaming (agent actions at each time step)
  - Agent roster display
  - Time step markers
  - ~20 second completion
- **Screen 3: Results**
  - Qualitative narrative (LLM-generated from structured event log)
  - Basic metric cards: redemption rate, leakage %, risk score (point estimates for Quick Scan)
  - Failure modes identified with recommendations
  - Each recommendation linked to specific failure mode

#### 1.3 LLM Integration (3 calls per Quick Scan)
- Agent decision resolution: LLM proposes actions, engine validates
- Activity log narrative generation from event log
- Executive summary generation (300 words, non-technical audience)
- Agent decision cache: state hash lookup to avoid redundant calls

#### 1.4 Pre-loaded Defaults
- India agri-subsidy / Bihar rural context fully configured
- Ready for immediate demo without any user input

#### 1.5 Test Suite
- Engine unit tests: conservation laws, constraint validation, state transitions
- Property-based tests: conservation holds for any sequence of valid agent actions
- Snapshot tests: fixed seed produces byte-identical output
- LLM integration tests: mocked responses, fallback paths

### Success Metric
A non-technical user can configure an agri-subsidy program, run a Quick Scan, and get a meaningful narrative about failure modes in under 60 seconds.

### Key Risk
Engine complexity vs. 3-week timeline. **Mitigation:** Start with 5 time steps, 12 agents, 3 stress scenarios. The isomorphic library boundary forces clean separation early, which actually speeds up development.

---

## Phase 2: Monte Carlo (Weeks 4-9)

**Theme:** "From stories to statistics"

### Deliverables

#### 2.1 Server-Side Engine
- Import `@vouch/simulate-engine` server-side (Node.js via Next.js)
- 10-20 time steps per run (calibrated to program type)
- All 30+ agent types active across 8 factions
- All 7 stress scenarios implemented: oracle failure, collusion attack, liquidity crunch, cold start, political weaponization, competitor sabotage, AI-scale Sybil attack

#### 2.2 Monte Carlo Orchestration
- BullMQ job queue (Redis-backed) for Full Simulation async execution
- 20 concurrent runs per batch (respecting API rate limits)
- SSE (Server-Sent Events) progress streaming
  - Live completion counter
  - Early distribution previews as runs finish
  - Estimated time remaining
- Early-stop logic: if first 30 runs show catastrophic failure rate >80%, surface blocking warning and offer to stop
- Streaming aggregation: each run's results written to Postgres immediately (never hold all results in RAM)
- Failed runs: retry once, then exclude with logged reason
- Configuration warning if >5% of runs fail validation

#### 2.3 Distribution Dashboard
- Headline metrics as full distributions: mean, median, p5/p95, standard deviation, sample size
  - Redemption rate distribution
  - Leakage % distribution (p95 tail highlighted as most operationally important)
  - Catastrophic failure rate (percentage of runs breaching customer-defined threshold)
  - Collusion success rate
  - Risk score distribution (0-10 composite)
  - Margin of error displayed prominently (plus or minus 10% for 100 runs)
- Density charts and violin plots
- Confidence intervals (shown only when 30+ runs complete and variance stabilizes)
- Clear labeling: synthetic vs. calibrated inputs

#### 2.4 Failure Mode Catalog
- Each failure mode across 100 runs reported with:
  - Name and description
  - Frequency: occurred in N of 100 runs
  - Severity at median and p95
  - Causal pathway: which agents, what sequence, which time steps
  - Associated parameters: which sampled parameters predicted this failure
  - Correlation with other failure modes
  - Specific design change recommendation

#### 2.5 Delta View
- Baseline vs. revised side-by-side comparison
  - Leakage distribution overlay
  - Catastrophic failure rate comparison
  - Risk score distribution comparison
- "Apply recommendation and re-run" one-click button
  - Pre-populates config form with suggested parameter change
  - Runs delta simulation automatically
- Tradeoff surfacing: if reducing leakage also reduces redemption rate, both shown

#### 2.6 Simulation Replay Viewer
- Select any individual run from a Full Simulation
- Scrub through time steps like a video player
- Each step shows: agent actions, engine validations, constraint rejections, ledger changes
- Click any output metric to trace the causal pathway back to specific agent actions at specific time steps
- "Why did this run fail?" click-through

#### 2.7 PDF Export
- Puppeteer server-side rendering
- Full report includes:
  - Program parameter summary
  - Simulation methodology and run count
  - Input type disclosure (synthetic vs. calibrated)
  - Agent roster description
  - Headline distribution metrics with confidence intervals
  - Failure mode catalog with frequencies and causal pathways
  - Recommendations
  - Delta view (if applicable)
  - Executive summary (LLM-generated, 300 words)
  - Statistical methodology appendix
  - Run ID, engine version, parameter seed hash

#### 2.8 Persistence
- Postgres schema: simulations, runs, results, program configs, run history per customer
- Engine version tag on all results
- Parameter seeds stored for reproducibility

#### 2.9 LLM Cost Optimization
- Agent decision cache (state hash to action mapping)
- Benchmark actual LLM calls per 100-run simulation
- Cost tracking per simulation (visible in admin, enterprise API)
- Target: median cost under $1 per 100-run simulation

#### 2.10 Expanded Context
- All 7 asset types with oracle mappings: fiat/voucher, cloud compute, equity/tokens, carbon credits, data/access, physical goods, custom
- 20+ countries with region-specific parameter defaults
- All 5 program types: govt subsidy, corporate voucher, NGO/aid, B2B trade finance, agentic commerce

#### 2.11 Tiered UX
- Beginner: Quick Scan only, narrative output, simple metric cards
- Advanced: Full Simulation, distribution charts, confidence intervals, failure mode catalog, delta view
- Expert: Full parameter tuning, distribution customization, audit log access

### Success Metric
A risk analyst can run 100 simulations, see distribution charts with confidence intervals, explore failure modes via the replay viewer, and export a PDF report suitable for a compliance meeting.

### Key Risk
LLM cost at scale. **Mitigation:** Cache aggressively from day 1, benchmark actual call counts in week 5, have heuristic fallbacks ready as emergency cost circuit breaker.

---

## Phase 3: Calibration + Collaboration (Weeks 10-15)

**Theme:** "From synthetic to real-world"

### Deliverables

#### 3.1 Calibration Data Pipeline
- Upload UI: CSV/JSON historical program data
- Strict schema validation + data quality checks (sandboxed parsing, no eval)
- Automatic distribution fitting: upload data converted to calibrated parameter distributions
- External data integration (open data sources only):
  - Transparency International CPI (corruption index)
  - ITU connectivity scores
  - World Bank governance indicators
  - UN HDI data
- Clear labeling in all outputs: "exploratory estimate" (synthetic) vs. "data-informed estimate" (calibrated)

#### 3.2 Benchmark Layer (v1)
- Anonymized aggregate from Vouch platform programs
- K-anonymity enforcement: minimum 5 programs per cohort before any aggregate surfaces
- Differential privacy noise for small cohorts
- Contextual benchmark cards in results UI
- **One-click competitor comparison**: your program's metrics overlaid on benchmark distribution as a dot on the bell curve
- Opt-in flow after first Full Simulation (clear disclosure of what is shared and how anonymized)
- Benchmark data versioned and disclosed in report appendix

#### 3.3 Sensitivity Analysis
- Derived from actual re-simulations (not directional estimates)
- Parameter correlation heatmap
- "Which parameters most predict catastrophic failure?"
- Where full re-simulation data unavailable: labeled "Directional estimate — re-run with modified parameter to confirm"

#### 3.4 Collaboration Features
- Team workspaces: multiple users, shared simulation history
- Shareable simulation links (read-only, time-limited)
- Comments on simulation results
- Role-based access: designer, reviewer, approver

#### 3.5 Vouch API Integration
- Pre-populate config from live Vouch program configuration
- "Test my live program" one-click entry point

#### 3.6 Audit Trail (v1)
- Immutable log: every simulation, parameters, results, accepted recommendations
- Engine version + schema version + timestamp on every record
- Run reproducibility verification endpoint (given run ID + seed, reproduce exact result)
- Parameter seed hash for tamper detection

### Success Metric
A government compliance team can upload their program's historical data, run a calibrated simulation, see their program's risk relative to comparable programs, share the report with colleagues, and send it to their regulator.

---

## Phase 4: Marketplace + Regulatory (Weeks 16-24)

**Theme:** "The platform becomes a network"

### Deliverables

#### 4.1 Program Template Marketplace
- Pre-tested program templates with known risk profiles
- "Fork and customize" — start from a validated design, modify for your context
- Template risk scores: "This template has been simulated 10,000 times. Median leakage: 8%. Catastrophic failure: 3%."
- Community-contributed templates (moderated, quality-reviewed)
- Category browse: by asset type, program type, region
- Template versioning: updated risk profiles as the engine improves

#### 4.2 Regulatory Pre-Approval Workflow
- "Generate regulatory package" — one-click PDF bundle optimized for regulatory submission
- Methodology appendix auto-generated
- Configurable report format per regulatory body (start with RBI India, MAS Singapore, FCA UK)
- Submission tracking: draft, sent, reviewed, approved/rejected
- Regulator portal (read-only): regulators can view simulation results, verify reproducibility, leave comments
- Audit log accessible from regulator portal

#### 4.3 Enterprise API (v1)
- Trigger simulations programmatically (POST /api/v1/simulate)
- Webhook callbacks on completion
- CI/CD integration: test program changes before deploying to production
- API key management: scoped to organization, rotatable, rate-limited
- Usage metering and billing integration

#### 4.4 Embeddable Risk Badge
- `<script>` widget showing live simulated risk score
- "Simulated by Vouch" trust mark with click-through to public summary
- Customizable: color, size, detail level
- CDN-hosted for performance
- Auto-refresh when new simulations complete

#### 4.5 "What If" Natural Language Bar
- Persistent input bar on results screen
- Type natural language queries: "what if corruption doubles?" / "what if we add biometric oracle?"
- LLM parses intent, maps to parameter change, shows confirmation, runs delta simulation
- History of "what if" queries and their results

#### 4.6 Certified Simulation Mode
- Fixed, versioned prompt chain (no prompt changes without version bump)
- Independent methodology review (CDIR fellows program)
- Prompt chain hash included in report for auditability
- "Certified" badge on reports that use certified mode
- Certified mode restricts parameter customization to ensure reproducibility

### Success Metric
A new customer can browse the template marketplace, fork a "government subsidy / India rural" template, customize it, simulate it, generate a regulatory submission package, and embed a risk badge on their program page — all in under 30 minutes.

---

## Phase 5: Continuous Simulation + Red Team (Weeks 25-36)

**Theme:** "From pre-launch testing to always-on monitoring"

### Deliverables

#### 5.1 Continuous Simulation
- Live program data feeds back into the simulator via Vouch API
- Configurable schedule: daily, weekly, on-config-change
- Automatic re-simulation with calibrated parameters from live data
- **Drift detection**: compare actual program metrics against simulated p5-p95 range
  - "Your program's actual leakage (12%) is outside the simulated range (4-9%). Investigate."
- Alert rules: email, Slack, webhook when drift exceeds threshold
- Historical trend dashboard: risk score, leakage, redemption rate over time
- Regression detection: "After your last config change, simulated risk increased from 3.2 to 5.7"

#### 5.2 Adversarial Red Team Service
- "Find my program's weakest point" — automated adversarial parameter space search
- Genetic algorithm: evolve attack strategies that maximize leakage or catastrophic failure
- Red team report:
  - Most effective attack vector
  - Success rate across parameter space
  - Specific design changes to defend against it
  - Comparison to pre-mitigation baseline
- Scheduled red team runs: monthly, quarterly (configurable)
- Red team history: track how program resilience improves over time

#### 5.3 Agentic Commerce Simulation Mode
- Dedicated mode for programs where both issuer and beneficiary are AI agents
- Failure modes specific to machine-to-machine: latency attacks, race conditions, hallucinated conditions, API abuse
- Machine-speed agent interaction model (millisecond time steps vs. day/week)
- API-specific stress scenarios: rate limit probing, credential stuffing, replay attacks at scale

#### 5.4 Advanced Analytics
- Cross-simulation comparison: "My Q1 design vs. Q3 design" with trend lines
- Portfolio view: all organization's programs on a single risk dashboard
- Correlation analysis: which programs share failure modes?
- Anomaly detection: "This program's risk profile changed significantly since last month"

#### 5.5 Run Count Tiers
- Standard: 100 runs (plus or minus 10% margin of error)
- Enterprise: 1,000 runs (plus or minus 3%)
- Institutional: 10,000 runs (plus or minus 1%)
- Streaming aggregation for 10K runs (progressive statistics, never all in RAM)

### Success Metric
A deployed program receives a Slack alert: "Your weekly simulation detected drift. Actual leakage 12% vs. expected 4-9%. Red team analysis suggests oracle collusion in low-connectivity sub-regions. Click to see the full report and recommended fix."

---

## Phase 6: Platform Flywheel (Weeks 37-52)

**Theme:** "Every simulation makes the platform smarter"

### Deliverables

#### 6.1 Failure Mode Library (Public)
- Searchable catalog of every failure mode discovered across all simulations
- Fully anonymized, aggregated across the platform
- Categories: Oracle Collusion Patterns, Sybil Attack Vectors, Political Weaponization Scenarios, etc.
- Each entry: description, frequency, severity distribution, vulnerable program types, recommended mitigations
- Trending failure modes: new attack patterns surfacing across the platform
- Public access — no login required (content marketing + thought leadership)

#### 6.2 Smart Defaults Engine
- Platform learns optimal parameter defaults from successful programs (low leakage, high redemption)
- "Programs in this region with this asset type typically use these parameters. Start from there?"
- A/B testing: do smart defaults produce better program designs?
- Feedback loop: recommendations that get accepted and produce better results are weighted higher

#### 6.3 Multi-Program Interaction Simulation
- Simulate what happens when two Vouch programs operate in the same geography
- Do they compete for merchants? Do fraud rings spread between them?
- Network effects modeling: does adding a second program increase or decrease risk?
- Portfolio-level optimization: "Given your three programs, here's the optimal resource allocation"

#### 6.4 Regulatory Intelligence
- Track regulatory requirements by jurisdiction (auto-updated)
- Proactive alerts: "New regulation X in Kenya requires Y. Your current design does/doesn't comply."
- "Simulate the impact of adding compliance rule Z" — one-click regulatory scenario
- Regulatory requirement library maintained by Vouch team + community

#### 6.5 Public Risk Scoreboard
- Opt-in: programs publish their simulated risk scores publicly
- Trust signal for beneficiaries and partners
- Leaderboard: "Top-rated programs by category"
- "This program has been simulated 50,000 times. Risk score: 3.2/10. Catastrophic failure rate: 2%."

#### 6.6 Self-Serve Custom Agent Types
- Customers define their own agent types with custom utility functions
- Visual utility function builder
- "In our market, there's a specific type of fraud where..." — model it as an agent
- Marketplace for community-contributed agent types (moderated)

### Success Metric
The platform has a data moat. Every simulation makes calibration better, benchmarks richer, and failure mode detection more comprehensive. New customers get better defaults, more relevant benchmarks, and a richer failure mode catalog than any customer who joined 6 months ago. The flywheel is spinning.

---

## Data Flywheel Diagram

```
  ┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
  │ Customer runs     │  ───►  │ Anonymized data   │  ───►  │ Better defaults  │
  │ simulation        │        │ feeds benchmarks  │        │ & calibration    │
  └──────────────────┘         └──────────────────┘        └───────┬──────────┘
        ▲                                                          │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
        More accurate simulations → more customers → more data
```

---

## Agent Decision Resolution Flow

```
  Agent needs decision at time step T
       │
       ▼
  Cache lookup (hash of: agent_type + system_state + agent_state)
       │
       ├──► HIT ──► Use cached decision (log as cache_hit)
       │
       ▼ MISS
  LLM API call (Claude)
       │
       ├──► Success ──► Validate JSON schema
       │                    │
       │                    ├──► Valid ──► Constraint check (Layer 1)
       │                    │                │
       │                    │                ├──► Passes ──► Apply action + cache result
       │                    │                │
       │                    │                └──► Fails ──► Log as "attempted", skip action
       │                    │
       │                    └──► Invalid JSON ──► Retry 1x ──► Still invalid? ──► Heuristic fallback
       │
       ├──► Timeout ──► Retry 2x w/ backoff ──► Still timeout? ──► Heuristic fallback
       │
       ├──► Rate limit (429) ──► Exponential backoff (respect Retry-After) ──► Re-queue
       │
       ├──► Refusal ──► Heuristic fallback (don't retry)
       │
       └──► Empty response ──► Retry 1x ──► Still empty? ──► Heuristic fallback

  All fallbacks logged: run_id, step, agent_id, failure_type, fallback_action
  If >20% of decisions in a run use heuristic fallback: flag run as "degraded"
```

---

## Error & Rescue Registry

| Exception Class | Rescued? | Rescue Action | User Sees |
|---|---|---|---|
| InvalidDistributionError | Y | Fall back to synthetic defaults | Warning: "Using defaults" |
| NumericOverflowError | Y | Clamp + log + continue | Nothing (transparent) |
| ConservationViolationError | Y | Exclude run + log reason | Run excluded from aggregate |
| InvalidTransitionError | Y | Exclude run + log | Run excluded from aggregate |
| ConstraintViolationError | Y | Log as "attempted" + skip action | Agent action logged as blocked |
| MaxIterationError | Y | Terminate step + log | Run excluded from aggregate |
| LLMTimeoutError | Y | Retry 2x w/ backoff, then heuristic | "Agent decision defaulted" |
| AgentResponseParseError | Y | Retry 1x, then heuristic fallback | "Agent decision defaulted" |
| InvalidAgentActionError | Y | Constraint validator catches this | Agent action logged as blocked |
| LLMRefusalError | Y | Use heuristic fallback | "Agent decision defaulted" |
| LLMRateLimitError | Y | Exponential backoff, queue pause | Progress slows (SSE update) |
| EmptyAgentResponseError | Y | Heuristic fallback | "Agent decision defaulted" |
| SimulationDegradedError | Y | Show warning + continue | "X runs excluded" banner |
| SimulationFailedError | Y | Abort + show config warning | "Simulation failed" + reasons |
| JobTimeoutError | Y | Retry 1x, then exclude | Run excluded from aggregate |
| RedisConnectionError | Y | Retry connection 3x, then fail | "Service temporarily unavailable" |
| InsufficientDataError | Y | Block output generation | "Not enough valid runs" |
| StatisticalError | Y | Exclude metric + log | Metric shows "insufficient data" |
| ConvergenceWarning | Y | Show warning, don't block | "Variance not yet stable" label |
| ExportTimeoutError | Y | Retry 1x, offer async delivery | "PDF generating... email when ready" |
| TemplateError | Y | Log + show raw data fallback | Degraded PDF with data tables |
| ChartRenderError | Y | Skip chart, show data table | Tables instead of charts |
| DataValidationError | Y | Reject upload + show errors | Validation error list |
| SchemaVersionError | Y | Reject + show migration guide | "Data format outdated" |
| ExternalDataSourceError | Y | Fall back to synthetic + warn | "Using synthetic defaults" |

---

## Security Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM prompt injection via condition logic | HIGH | HIGH | Structured condition builder. NL input parsed to structured rules before touching engine/LLM. Raw user text never in prompts. |
| Tenant data leakage via benchmarks | MED | HIGH | Row-level security. K-anonymity (min 5 programs). Differential privacy noise for small cohorts. |
| Parameter seed extraction | LOW | MED | Seeds encrypted at rest. API never returns raw seeds. Reproducibility via internal audit endpoint only. |
| DoS via 10K-run simulations | MED | MED | Per-tenant rate limiting. Job queue priority by tier. Resource quotas per org. |
| Malicious calibration data upload | MED | HIGH | Strict schema validation. Sandboxed parsing. No eval(). File size limits. Content-type verification. |
| PDF export XSS via agent narratives | MED | MED | Puppeteer sandboxed context. Sanitize all LLM output before template injection. |
| Enterprise API key theft | MED | HIGH | Keys rotatable, scoped to org, rate-limited. Audit log all API usage. |

---

## Observability (Day 1 Metrics)

### Dashboard Panels
- Simulations running (gauge), completed today (counter)
- Queue depth (gauge), avg run time (histogram)
- LLM calls/min (rate), cache hit rate (%), error rate (%), avg latency (histogram)
- LLM cost per simulation (gauge)
- Validation failures per simulation (histogram)
- Conservation violations (counter) — **should always be 0**
- Degraded runs percentage
- DB connections, Redis memory, Puppeteer pool, job retry rate

### Alert Rules
- Conservation violation count > 0: **P0 page** (engine bug — the most critical invariant is broken)
- LLM error rate > 10%: **P1 alert** (API issue or prompt regression)
- Validation failure rate > 5% per simulation: **P2 alert**
- Queue depth > 100: **P2 alert** (scaling issue)
- Cache hit rate < 50%: **P2 alert** (cache issue)

---

## Deployment Strategy

| Phase | Deploy Target | Rollback | Feature Flags |
|---|---|---|---|
| Phase 1 | Static hosting (Vercel/CF Pages) | Git revert + redeploy (~60s) | None needed |
| Phase 2 | Vercel (Next.js) + Worker (BullMQ) + Managed Postgres | Vercel instant rollback + worker version pin | `full_simulation_enabled` per tenant |
| Phase 3+ | Same + calibration pipeline | Feature flag off (data migrations backward-compat) | Per-feature flags |
| Phase 5 | + Continuous monitoring cron jobs | Feature flag off | `continuous_sim_enabled` per tenant |

**Engine versioning:** Every simulation result tagged with engine version. Canary deploys for engine changes (1% traffic first, auto-rollback if validation spike).

---

## Open Questions (Resolved)

| Question | Resolution |
|---|---|
| Engine: browser vs. server? | Isomorphic TS library. Both. |
| Agent decisions: LLM vs. heuristic? | LLM-primary with caching. Heuristic fallback for failures only. |
| Condition logic: free text vs. structured? | Structured builder with NL input option (parsed before engine/LLM). |
| Catastrophic failure threshold defaults? | Show defaults by program type, allow customer override. |
| Phase 1 engine complexity? | Full conservation rules, simplified event-trigger logic (5 time steps, 12 agents, 3 scenarios). |
| Calibration data licensing? | Launch with open data sources only (TI CPI, ITU, World Bank). Add proprietary benchmarks in Phase 4+. |
| Benchmark opt-in design? | Opt-in prompt after first Full Simulation with clear disclosure. K-anonymity enforced. |
| Agentic commerce mode? | Dedicated simulation profile in Phase 5. |

---

## Not In Scope

1. **Mobile app** — simulation is a desktop workflow. Mobile can view reports via responsive web.
2. **Real-time multiplayer simulation** — shareable links suffice for collaboration.
3. **Custom LLM fine-tuning** — Claude's general capabilities are sufficient. Fine-tuning is premature.
4. **Blockchain audit recording** — Postgres + hash chains provide sufficient auditability.
5. **Hardware-in-the-loop simulation** — physical goods modeled as probability distributions.
6. **Multi-language UI** — English first. Localization is Phase 7+.

---

## Summary

```
  ════════════════════════════════════════════════════════════════════════════
  VOUCH SIMULATE — 12-MONTH CATHEDRAL ROADMAP
  ════════════════════════════════════════════════════════════════════════════
  Phase 1 (Wk 1-3)   Foundation        Engine + Quick Scan browser artifact
  Phase 2 (Wk 4-9)   Monte Carlo       100-run server, distributions, replay
  Phase 3 (Wk 10-15) Calibration       Real data, benchmarks, collaboration
  Phase 4 (Wk 16-24) Marketplace       Templates, regulatory, enterprise API
  Phase 5 (Wk 25-36) Continuous        Always-on monitoring, red team, 10K runs
  Phase 6 (Wk 37-52) Flywheel          Failure library, smart defaults, network
  ════════════════════════════════════════════════════════════════════════════
```
