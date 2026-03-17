# Vouch Simulate — Engineering Implementation Plan

## Decisions Record

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Monorepo tooling | Turborepo | Standard for Next.js, build caching, lowest config overhead |
| 2 | LLM boundary in engine | Adapter interface (DI) | Isomorphic: browser adapter vs server gateway adapter |
| 3 | Database schema | Hybrid relational + JSONB | Avoids 6M-row explosion; JSONB for run results, relational for metadata |
| 4 | Seedable randomness | `alea` library | Battle-tested, fast, passes Diehard tests, isomorphic |
| 5 | Progress streaming | Redis pub/sub → Next.js SSE | No new infrastructure; Redis already required for BullMQ |
| 6 | ORM / query layer | Drizzle ORM | SQL-first, lightweight, excellent TS inference, explicit |
| 7 | Agent definitions | Single registry (data-driven) | One typed `AgentDefinition` interface, one registry Map. DRY. |
| 8 | Context data | Hardcoded TypeScript objects | Type-safe, simple, no parsing. Extract to config files if edit frequency warrants it. |
| 9 | Condition rules | JSON AST | Composable, serializable, engine evaluates via recursive tree-walker |
| 10 | Conservation testing | Property-based testing (fast-check) | Critical invariant deserves 1000s of random test sequences |
| 11 | LLM test strategy | Recorded fixtures + nightly live test | Real LLM responses without cost/flakiness. Re-record quarterly. |
| 12 | Agent call parallelism | Parallel per step (concurrency=10) | 30 sequential calls = 60s/step. Parallel = 6s/step. |
| 13 | Chart library | Observable Plot | Statistical visualization native, ~50KB, SVG for PDF export |

---

## Tech Stack

```
  LAYER          │ TECHNOLOGY              │ PURPOSE
  ───────────────┼─────────────────────────┼──────────────────────────────────
  Monorepo       │ Turborepo + pnpm        │ Build orchestration, caching
  Engine library │ TypeScript (isomorphic) │ Deterministic sim, no runtime deps
  Web app        │ Next.js 14 App Router   │ Frontend + API routes
  Styling        │ Tailwind CSS            │ Utility-first, fast iteration
  Charts         │ Observable Plot         │ Density plots, histograms, violin
  UI components  │ shadcn/ui              │ Accessible, composable, unstyled base
  Database       │ PostgreSQL + Drizzle    │ Relational + JSONB hybrid
  Job queue      │ BullMQ (Redis)          │ Async Full Simulation execution
  Streaming      │ SSE via Redis pub/sub   │ Real-time progress to client
  LLM            │ Claude API (Anthropic)  │ Agent decisions + narrative
  PRNG           │ alea                    │ Seedable, deterministic randomness
  PDF export     │ Puppeteer               │ Server-side report rendering
  Testing        │ Vitest + fast-check     │ Unit, property-based, integration
  E2E testing    │ Playwright              │ Browser-based flow testing
  CI             │ GitHub Actions          │ Build, test, deploy pipeline
```

---

## Repository Structure

```
  vouch-simulate/
  ├── turbo.json                          Turborepo config
  ├── package.json                        Root workspace (pnpm)
  ├── pnpm-workspace.yaml                 Workspace definition
  ├── .github/
  │   └── workflows/
  │       ├── ci.yml                      Build + test on PR
  │       └── nightly.yml                 Property tests + live LLM tests
  │
  ├── packages/
  │   └── engine/                         @vouch/simulate-engine
  │       ├── package.json
  │       ├── tsconfig.json
  │       ├── vitest.config.ts
  │       ├── src/
  │       │   ├── index.ts                Public API
  │       │   │
  │       │   ├── core/
  │       │   │   ├── engine.ts           DeterministicEngine class
  │       │   │   │                       - initState(config, params) → State
  │       │   │   │                       - stepForward(state, actions) → State
  │       │   │   │                       - runSimulation(config, params, adapter) → RunResult
  │       │   │   ├── state.ts            Type definitions
  │       │   │   │                       - LedgerState, AgentState, SystemState, EventLog
  │       │   │   │                       - SimulationConfig, RunResult, TimeStep
  │       │   │   ├── conservation.ts     Conservation law enforcement
  │       │   │   │                       - enforceConservation(ledger) → void | throws
  │       │   │   │                       - checkConservation(ledger) → boolean
  │       │   │   ├── constraints.ts      Constraint validation
  │       │   │   │                       - validateAction(action, state, rules) → Valid | Rejected
  │       │   │   ├── transitions.ts      State transition logic
  │       │   │   │                       - applyActions(state, validActions) → State
  │       │   │   │                       - triggerEvents(state, eventTimings) → State
  │       │   │   └── rules.ts            JSON AST rule evaluator
  │       │   │                           - evaluateRule(rule, context) → boolean
  │       │   │                           - validateRuleSchema(rule) → ValidationResult
  │       │   │
  │       │   ├── agents/
  │       │   │   ├── types.ts            AgentDefinition interface
  │       │   │   │                       - type, faction, utilityFn, constraints, actionSpace
  │       │   │   ├── registry.ts         Agent registry (Map<AgentType, AgentDefinition>)
  │       │   │   │                       - All 30+ agents defined as typed data objects
  │       │   │   │                       - getAgentsByFaction(faction) → AgentDefinition[]
  │       │   │   │                       - getAgentsByContext(assetType, country, programType)
  │       │   │   ├── resolver.ts         Agent decision resolution
  │       │   │   │                       - resolveDecision(agent, state, adapter) → Action
  │       │   │   │                       - Uses adapter interface for LLM calls
  │       │   │   └── heuristics.ts       Heuristic fallbacks (emergency only)
  │       │   │                           - heuristicDecision(agent, state) → Action
  │       │   │
  │       │   ├── sampling/
  │       │   │   ├── distributions.ts    Statistical distribution samplers
  │       │   │   │                       - sampleBeta(alpha, beta, rng) → number
  │       │   │   │                       - sampleBernoulli(p, rng) → boolean
  │       │   │   │                       - samplePoisson(lambda, rng) → number
  │       │   │   │                       - samplePareto(alpha, rng) → number
  │       │   │   ├── sampler.ts          Parameter vector sampling
  │       │   │   │                       - sampleParameterVector(distributions, rng) → ParamVector
  │       │   │   └── random.ts           Seedable PRNG wrapper around alea
  │       │   │                           - createRNG(seed) → { next(): number }
  │       │   │
  │       │   ├── context/
  │       │   │   ├── assets.ts           7 asset types + oracle mappings
  │       │   │   ├── countries.ts        Country/region parameter defaults
  │       │   │   └── programs.ts         5 program types + faction defaults
  │       │   │
  │       │   └── adapters/
  │       │       └── types.ts            LLMAdapter interface
  │       │                               - resolveAgentDecision(context) → Promise<Action>
  │       │                               - generateNarrative(eventLog) → Promise<string>
  │       │                               - generateSummary(results) → Promise<string>
  │       │
  │       └── tests/
  │           ├── core/
  │           │   ├── conservation.test.ts      Unit + property-based (fast-check)
  │           │   ├── conservation.prop.test.ts  Property tests: 1000 random action seqs
  │           │   ├── constraints.test.ts        Constraint validation
  │           │   ├── engine.test.ts             Full run with mock adapter
  │           │   ├── rules.test.ts              JSON AST evaluation
  │           │   └── transitions.test.ts        State transitions
  │           ├── agents/
  │           │   ├── registry.test.ts           Agent lookup, filtering
  │           │   ├── resolver.test.ts           Cache hit, LLM success, fallback chain
  │           │   └── heuristics.test.ts         Heuristic decisions
  │           ├── sampling/
  │           │   ├── distributions.test.ts      Statistical properties verified
  │           │   ├── sampler.test.ts            Parameter vector shape
  │           │   └── random.test.ts             Seed determinism
  │           └── fixtures/
  │               └── llm-responses/             Recorded Claude API responses
  │                   ├── corrupt-field-agent.json
  │                   ├── eligible-beneficiary.json
  │                   └── ...
  │
  └── apps/
      └── web/                                   Next.js 14 App Router
          ├── package.json
          ├── next.config.ts
          ├── tailwind.config.ts
          ├── drizzle.config.ts
          ├── vitest.config.ts
          ├── playwright.config.ts
          │
          ├── src/
          │   ├── app/
          │   │   ├── layout.tsx                 Root layout
          │   │   ├── page.tsx                   Landing / entry point
          │   │   │
          │   │   ├── simulate/
          │   │   │   ├── configure/
          │   │   │   │   └── page.tsx           Screen 1: Config wizard
          │   │   │   ├── running/
          │   │   │   │   └── page.tsx           Screen 2: Progress
          │   │   │   ├── results/
          │   │   │   │   └── page.tsx           Screen 3: Results dashboard
          │   │   │   └── replay/
          │   │   │       └── [runId]/
          │   │   │           └── page.tsx       Simulation replay viewer
          │   │   │
          │   │   └── api/
          │   │       ├── simulate/
          │   │       │   └── route.ts           POST: trigger simulation
          │   │       ├── progress/
          │   │       │   └── [simId]/
          │   │       │       └── route.ts       GET: SSE progress stream
          │   │       └── export/
          │   │           └── [simId]/
          │   │               └── route.ts       GET: trigger PDF export
          │   │
          │   ├── lib/
          │   │   ├── llm/
          │   │   │   ├── gateway.ts             Server-side LLM adapter
          │   │   │   │                          - Implements LLMAdapter interface
          │   │   │   │                          - Retry, rate limit, error handling
          │   │   │   ├── cache.ts               Agent decision cache
          │   │   │   │                          - Redis-backed, keyed by state hash
          │   │   │   │                          - TTL: 24h (or until engine version bump)
          │   │   │   └── prompts/
          │   │   │       ├── agent-decision.ts  Prompt template for agent decisions
          │   │   │       ├── narrative.ts        Prompt template for activity log
          │   │   │       └── summary.ts          Prompt template for exec summary
          │   │   │
          │   │   ├── llm-browser/
          │   │   │   └── adapter.ts             Browser-side LLM adapter
          │   │   │                              - Thin Claude SDK wrapper
          │   │   │                              - No cache, no retry (simple)
          │   │   │
          │   │   ├── jobs/
          │   │   │   ├── simulation.job.ts      BullMQ job definition
          │   │   │   │                          - Runs N simulation runs
          │   │   │   │                          - Publishes progress to Redis channel
          │   │   │   │                          - Writes results to DB per-run
          │   │   │   └── worker.ts              BullMQ worker process
          │   │   │
          │   │   ├── monte-carlo/
          │   │   │   ├── orchestrator.ts        Dispatches runs, collects results
          │   │   │   │                          - Batch: 20 concurrent runs
          │   │   │   │                          - Early-stop check at 30 runs
          │   │   │   ├── aggregator.ts          Streaming distribution stats
          │   │   │   │                          - Running mean, variance, percentiles
          │   │   │   │                          - Updates per-run (never holds all in RAM)
          │   │   │   └── delta.ts               Delta computation between two sims
          │   │   │
          │   │   ├── db/
          │   │   │   ├── schema.ts              Drizzle schema definition
          │   │   │   ├── migrations/            Drizzle-kit generated migrations
          │   │   │   └── queries.ts             Query functions
          │   │   │
          │   │   └── export/
          │   │       ├── pdf.ts                 Puppeteer PDF generation
          │   │       └── templates/             HTML templates for PDF report
          │   │
          │   └── components/
          │       ├── config/
          │       │   ├── asset-type-selector.tsx
          │       │   ├── country-region-picker.tsx
          │       │   ├── program-type-selector.tsx
          │       │   ├── condition-builder.tsx   Visual IF/THEN/AND/OR rule builder
          │       │   ├── program-params-form.tsx
          │       │   ├── simulation-settings.tsx
          │       │   └── stress-scenario-picker.tsx
          │       │
          │       ├── progress/
          │       │   ├── quick-scan-log.tsx      Live activity log
          │       │   ├── full-sim-progress.tsx   Progress ring + partial stats
          │       │   └── early-stop-dialog.tsx   Catastrophic failure warning
          │       │
          │       ├── results/
          │       │   ├── metric-card.tsx         Single metric distribution display
          │       │   ├── failure-mode-catalog.tsx
          │       │   ├── recommendations.tsx     Actionable recommendations
          │       │   ├── delta-view.tsx          Baseline vs revised comparison
          │       │   └── executive-summary.tsx   LLM-generated summary
          │       │
          │       ├── replay/
          │       │   ├── time-step-scrubber.tsx  Timeline scrubber control
          │       │   ├── agent-actions-panel.tsx Agent decisions at current step
          │       │   ├── ledger-panel.tsx        Ledger state at current step
          │       │   └── causal-trace.tsx        Click metric → trace pathway
          │       │
          │       └── charts/
          │           ├── density-chart.tsx       Observable Plot density wrapper
          │           ├── histogram.tsx           Observable Plot histogram wrapper
          │           └── confidence-interval.tsx CI display component
          │
          └── tests/
              ├── api/
              │   ├── simulate.test.ts           API route tests
              │   └── progress.test.ts           SSE streaming tests
              ├── lib/
              │   ├── llm-gateway.test.ts        Retry, fallback, rate limit
              │   ├── cache.test.ts              Cache hit/miss/corruption
              │   ├── orchestrator.test.ts       Monte Carlo dispatch + collection
              │   ├── aggregator.test.ts         Streaming stats correctness
              │   └── delta.test.ts              Delta computation
              └── e2e/
                  ├── quick-scan.spec.ts         Full Quick Scan flow
                  ├── full-simulation.spec.ts    Full Sim with mock worker
                  └── delta-rerun.spec.ts        Apply recommendation → delta
```

---

## Database Schema (Drizzle)

```sql
  -- Core simulation tables (Phase 2)

  simulations
  ├── id                UUID PRIMARY KEY
  ├── org_id            UUID NOT NULL           -- tenant isolation
  ├── status            ENUM('draft','validated','queued','running','completed','degraded','failed')
  ├── mode              ENUM('quick_scan','full_simulation')
  ├── config            JSONB NOT NULL          -- full program config snapshot
  ├── simulation_params JSONB NOT NULL          -- run count, stress scenarios, etc.
  ├── engine_version    VARCHAR NOT NULL        -- e.g. "1.0.0"
  ├── input_type        ENUM('synthetic','calibrated')
  ├── aggregate_stats   JSONB                   -- computed after all runs complete
  ├── failure_modes     JSONB                   -- failure mode catalog
  ├── created_at        TIMESTAMP DEFAULT NOW()
  ├── completed_at      TIMESTAMP
  └── INDEX ON (org_id, created_at DESC)

  simulation_runs
  ├── id                UUID PRIMARY KEY
  ├── simulation_id     UUID REFERENCES simulations(id)
  ├── run_number        INTEGER NOT NULL
  ├── seed              BIGINT NOT NULL         -- for reproducibility
  ├── status            ENUM('pending','running','valid','invalid','errored')
  ├── parameter_vector  JSONB NOT NULL          -- sampled params for this run
  ├── result            JSONB                   -- full event log + final state
  ├── validation_errors JSONB                   -- if invalid, why
  ├── created_at        TIMESTAMP DEFAULT NOW()
  ├── completed_at      TIMESTAMP
  └── INDEX ON (simulation_id, run_number)

  -- Phase 3 additions

  calibration_uploads
  ├── id                UUID PRIMARY KEY
  ├── org_id            UUID NOT NULL
  ├── filename          VARCHAR NOT NULL
  ├── schema_version    VARCHAR NOT NULL
  ├── status            ENUM('processing','valid','invalid')
  ├── fitted_distributions JSONB               -- calibrated distributions from data
  ├── validation_errors JSONB
  ├── created_at        TIMESTAMP DEFAULT NOW()
  └── INDEX ON (org_id, created_at DESC)

  benchmark_data
  ├── id                UUID PRIMARY KEY
  ├── cohort_key        VARCHAR NOT NULL        -- e.g. "fiat_voucher:india:govt_subsidy"
  ├── program_count     INTEGER NOT NULL        -- must be >= 5 (k-anonymity)
  ├── stats             JSONB NOT NULL          -- aggregated statistics
  ├── computed_at       TIMESTAMP DEFAULT NOW()
  └── UNIQUE INDEX ON (cohort_key)
```

---

## Phase 1 Implementation Plan (Weeks 1-3)

### Week 1: Engine Core + Sampling

**Day 1-2: Project scaffolding**
- Initialize Turborepo monorepo with `packages/engine` and `apps/web`
- Configure TypeScript, Vitest, ESLint, Prettier
- Set up `@vouch/simulate-engine` package with build config (tsup for dual CJS/ESM)
- Set up CI pipeline (GitHub Actions: build + test on PR)

**Day 3-4: State model + conservation**
- Implement `state.ts`: all type definitions (LedgerState, AgentState, SystemState, EventLog)
- Implement `conservation.ts`: `enforceConservation()` and `checkConservation()`
- Implement `constraints.ts`: `validateAction()` — rejects actions violating program rules
- Write property-based tests with fast-check: conservation holds for random action sequences
- Write unit tests: every constraint type tested

**Day 5: Sampling + randomness**
- Implement `random.ts`: seedable PRNG wrapper around `alea`
- Implement `distributions.ts`: Beta, Bernoulli, Poisson, Pareto samplers
- Implement `sampler.ts`: `sampleParameterVector()` — draws full param vector from distributions
- Write tests: statistical properties (mean within 5% of theoretical for 10K samples), seed determinism

### Week 2: Agents + Engine Loop + Rules

**Day 1-2: Agent system**
- Define `AgentDefinition` interface in `types.ts`
- Implement `registry.ts`: all 12 Phase 1 agents as typed data objects
  - 1 per faction: eligible beneficiary, honest field agent, registered merchant, ruling party politician, trusted oracle, bank/NBFC, rival program operator, AI procurement agent
  - Plus 4 adversarial: corrupt field agent, shell merchant, compromised oracle, sybil attacker
- Implement utility functions as pure functions
- Define `LLMAdapter` interface in `adapters/types.ts`
- Implement `resolver.ts`: `resolveDecision()` using adapter interface
- Implement `heuristics.ts`: simple utility-maximizing fallbacks per agent type
- Write tests: registry lookup, resolver with mock adapter (success, timeout, parse error, refusal)

**Day 3-4: Engine loop + events**
- Implement `engine.ts`: `initState()`, `stepForward()`, `runSimulation()`
- Implement `transitions.ts`: `applyActions()`, `triggerEvents()`
- Implement `rules.ts`: JSON AST evaluator with `evaluateRule()`
- Engine loop: for each step → resolve all agent decisions (parallel) → validate → apply → trigger events → enforce conservation
- Write tests: full 5-step run with mock adapter, conservation holds at each step, snapshot test (seed determinism)

**Day 5: Context data**
- Implement `assets.ts`: 7 asset types with oracle mappings
- Implement `countries.ts`: India (Bihar rural) fully populated, 5 more countries stubbed
- Implement `programs.ts`: 5 program types with default faction configurations
- Wire up: config selectors produce context that drives agent roster + parameter defaults

### Week 3: Web App + LLM Integration

**Day 1-2: Config form (Screen 1)**
- Set up Next.js app with Tailwind + shadcn/ui
- Implement config form components:
  - Asset type selector (card grid)
  - Country + region picker (cascading dropdowns)
  - Program type selector
  - Condition builder (visual JSON AST editor)
  - Program parameters form
  - Simulation settings (Quick Scan only; Full Sim shows "coming soon")
  - Stress scenario multi-select
- Pre-load Bihar agri-subsidy defaults

**Day 3: LLM integration + Quick Scan**
- Implement browser-side LLM adapter (thin Claude SDK wrapper)
- Implement prompt templates for: agent decisions, activity log narrative, executive summary
- Wire up: config → engine.runSimulation() (client-side) → 3 LLM calls → results

**Day 4: Screens 2 + 3**
- Screen 2: Live activity log — stream time step events as they complete
- Screen 3: Results — narrative summary, basic metric cards (point estimates), failure modes list, recommendations
- Each recommendation linked to a specific failure mode

**Day 5: Polish + E2E test**
- E2E test: complete Quick Scan flow (configure → run → results)
- Fix rough edges from integration testing
- Record LLM fixtures for test suite
- Deploy browser artifact to Vercel

---

## Phase 2 Implementation Plan (Weeks 4-9)

### Week 4: Server Infrastructure

**Day 1-2: Database + Drizzle setup**
- Provision Postgres (Neon or Supabase for serverless)
- Define Drizzle schema: `simulations` + `simulation_runs` tables
- Run initial migration
- Implement query layer: create/read/update simulations and runs

**Day 3-4: BullMQ + Redis setup**
- Provision Redis (Upstash or Railway)
- Implement `simulation.job.ts`: job definition, input validation
- Implement `worker.ts`: BullMQ worker that runs simulation runs
- Wire up: POST /api/simulate → validate config → create DB record → enqueue job → return sim_id

**Day 5: SSE progress streaming**
- Implement Redis pub/sub: worker publishes `{sim_id}:{run_complete}` events
- Implement `GET /api/progress/[simId]`: SSE route that subscribes to Redis channel
- Client-side: EventSource with auto-reconnect
- Test: simulate 10 runs, verify SSE delivers all 10 completion events

### Week 5: Monte Carlo Engine

**Day 1-2: Orchestrator**
- Implement `orchestrator.ts`: dispatch runs in batches of 20
- Parallel execution within batch (Promise.allSettled)
- Per-run: sample params → run engine → validate → write to DB → publish SSE event
- Retry logic: failed run retries once, then excluded

**Day 3-4: Aggregation**
- Implement `aggregator.ts`: streaming statistics
  - Running mean, variance (Welford's algorithm — numerically stable)
  - Percentiles: p5, p25, p50, p75, p95 (t-digest or sorted insertion)
  - Confidence intervals (only shown when n >= 30 and CI width stable)
- Aggregate updates after each run completes (never holds all results in memory)

**Day 5: Early-stop + failure modes**
- Early-stop: at 30 runs, if catastrophic failure rate > 80%, surface warning via SSE
- Failure mode extraction: scan event logs across completed runs, group by failure pattern
- Compute frequency, median severity, p95 severity per failure mode

### Week 6: Expanded Engine (30+ agents, 10-20 steps)

**Day 1-3: Full agent roster**
- Add remaining 20+ agents to registry (all 8 factions fully populated)
- Implement all utility functions
- Implement context-variable behavioral parameters (corruption index modifies agent behavior)
- Record LLM fixtures for each new agent type

**Day 4-5: Extended time steps + all stress scenarios**
- Extend engine to support 10-20 time steps (configurable per program type)
- Implement all 7 stress scenarios: oracle failure, collusion attack, liquidity crunch, cold start, political weaponization, competitor sabotage, AI-scale Sybil attack
- Coalition formation: multi-step process across time steps

### Week 7: Results Dashboard

**Day 1-2: Distribution visualization**
- Implement chart components with Observable Plot:
  - Density chart (kernel density estimation)
  - Histogram with configurable bins
  - Confidence interval display (whisker + range)
- Implement metric cards: each shows mean, median, p5/p95, std, n, margin of error

**Day 3-4: Failure mode catalog + recommendations**
- Failure mode catalog UI: ranked by frequency × severity
- Each failure mode: name, frequency (N/100), severity at median and p95, causal pathway
- Recommendations: each linked to a specific failure mode
- "Apply and re-run" button: pre-populates config with suggested change

**Day 5: Executive summary**
- LLM-generated 300-word summary from aggregated structured output
- Prompt: write for non-technical audience (minister, board member)
- Lead with catastrophic failure rate and risk score, top 3 failure modes, 3 recommendations

### Week 8: Delta View + Replay

**Day 1-2: Delta view**
- Implement `delta.ts`: compute differences between two simulation aggregate results
- Delta UI: side-by-side density chart overlays (baseline vs revised)
- Catastrophic failure rate comparison, risk score comparison
- Tradeoff surfacing: if improving one metric worsens another, show both
- Store baseline reference on simulation record

**Day 3-4: Simulation replay viewer**
- Implement replay page: select any run from a Full Simulation
- Time step scrubber: slider through steps 1-20
- At each step: agent actions panel, ledger state panel, constraint violations
- Click any output metric → trace causal pathway to specific agent actions
- Data source: `result` JSONB from simulation_runs table (already stored)

**Day 5: Tiered UX**
- Implement beginner/advanced/expert mode toggle
- Beginner: Quick Scan only, narrative, simple cards, no distributions
- Advanced: Full Sim, distributions, CI, failure catalog, delta view
- Expert: full parameter tuning, audit log access

### Week 9: PDF Export + Polish

**Day 1-2: PDF export**
- Set up Puppeteer (containerized)
- Implement HTML report template: program summary, methodology, metrics, failure catalog, recommendations, executive summary, methodology appendix
- Include: run ID, engine version, parameter seed hash, input type disclosure
- Queue export jobs via BullMQ, max 3 concurrent

**Day 3-4: Integration testing + edge cases**
- E2E: full 100-run simulation → progress → results → delta → PDF
- Edge cases: double-click run, navigate away mid-sim, SSE reconnect, baseline deleted
- Load test: 5 concurrent Full Simulations
- Fix identified issues

**Day 5: Observability + deploy**
- Add structured logging: every simulation, run, LLM call, validation failure
- Add metrics: simulation count, LLM call rate, cache hit rate, validation failure rate
- Conservation violation counter (alert if > 0)
- Deploy to Vercel (web) + Railway/Render (worker) + managed Postgres + Redis

---

## Phase 3 Implementation Plan (Weeks 10-15)

### Week 10-11: Calibration Data Pipeline

- Upload UI: file input for CSV/JSON, drag-and-drop
- Server-side parsing: sandboxed, strict schema validation, file size limit (50MB)
- Distribution fitting: fit uploaded data to Beta/Bernoulli/Poisson/Pareto distributions
- Store fitted distributions in `calibration_uploads` table
- Wire into simulation: if calibrated data available, use calibrated distributions instead of synthetic defaults
- Output labeling: "exploratory estimate" vs "data-informed estimate"
- External data integration: TI CPI, ITU connectivity (fetch on demand, cache 24h)
- Tests: valid upload, invalid schema, empty file, oversized file, SQL injection in column names

### Week 12: Benchmark Layer

- Benchmark aggregation job: periodic (daily), scans completed simulations
- K-anonymity check: only surface aggregate when cohort has >= 5 programs
- Differential privacy noise for small cohorts
- Benchmark cards in results UI: your metric vs cohort distribution
- One-click competitor comparison: your program as a dot on the bell curve
- Opt-in flow: shown after first Full Simulation, clear privacy disclosure
- Store in `benchmark_data` table

### Week 13: Sensitivity Analysis

- After Full Simulation completes, compute parameter-outcome correlations
- Partial correlation: which parameters most predict each output metric
- Sensitivity heatmap component (Observable Plot)
- "Which parameters most predict catastrophic failure?" — highlighted in report
- Label where data is insufficient: "Directional estimate — re-run to confirm"

### Week 14: Collaboration

- Team workspaces: org_id scoping (already in schema)
- Shareable simulation links: generate time-limited read-only tokens
- Comments on simulation results: simple comment model (text + user + timestamp)
- Role-based access: designer (run sims), reviewer (view + comment), approver (export + share)
- Vouch API integration: pre-populate config from live program

### Week 15: Audit Trail + Polish

- Immutable audit log: every simulation create, parameter change, recommendation accepted, export generated
- Append-only table with trigger (no UPDATE/DELETE allowed)
- Run reproducibility endpoint: given run ID + seed, re-run and verify identical result
- Engine version + schema version on every record
- Phase 3 integration testing + edge cases
- Deploy calibration, benchmark, collaboration features behind feature flags

---

## Phases 4-6: Architectural Scaffolding

These phases are designed in the roadmap but don't need implementation-level detail yet. Key architectural decisions that affect Phases 1-3:

### Phase 4 (Marketplace + Regulatory) — What to build now:
- **Template data model:** Add `program_templates` table in Phase 2 schema (even if unused until Phase 4). Fields: template config, risk stats, fork count, version.
- **Regulatory export format:** Phase 2 PDF report should be structured enough that Phase 4 only adds formatting, not restructuring.
- **Enterprise API:** Phase 2 API routes should be designed for external consumption from day 1 (consistent error format, versioned paths, rate limit headers).

### Phase 5 (Continuous Sim + Red Team) — What to build now:
- **Engine as a library:** Already decided (Issue 1). This is what enables continuous monitoring to import the engine into a cron job.
- **Result schema extensibility:** JSONB for run results means Phase 5 can add new metric types without schema migration.
- **Event log richness:** Phase 1-2 event logs should capture enough detail for Phase 5's causal tracing and red team analysis.

### Phase 6 (Flywheel) — What to build now:
- **Anonymization pipeline:** The benchmark aggregation in Phase 3 is the seed of the flywheel. Build it to be extensible.
- **Agent registry extensibility:** The data-driven agent registry (Issue 7) naturally supports custom agent types in Phase 6.

---

## CI/CD Pipeline

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    CI PIPELINE (GitHub Actions)                  │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ON PULL REQUEST:                                               │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
  │  │ Lint     │  │ Type     │  │ Unit     │  │ Integration  │  │
  │  │ (ESLint) │  │ Check    │  │ Tests    │  │ Tests        │  │
  │  │          │  │ (tsc)    │  │ (Vitest) │  │ (Vitest)     │  │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
  │       │              │             │              │             │
  │       └──────────────┴─────────────┴──────────────┘             │
  │                            │                                    │
  │                     ALL PASS → ✅                               │
  │                                                                 │
  │  ON MERGE TO MAIN:                                              │
  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐                 │
  │  │ Build    │  │ E2E      │  │ Deploy       │                 │
  │  │ (turbo)  │→ │ Tests    │→ │ (Vercel +    │                 │
  │  │          │  │(Playwrt) │  │  Worker)     │                 │
  │  └──────────┘  └──────────┘  └──────────────┘                 │
  │                                                                 │
  │  NIGHTLY:                                                       │
  │  ┌───────────────┐  ┌────────────────┐                         │
  │  │ Property tests│  │ Live LLM test  │                         │
  │  │ (fast-check   │  │ (1 real Claude │                         │
  │  │  10K iters)   │  │  API call)     │                         │
  │  └───────────────┘  └────────────────┘                         │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Observability Plan

### Day 1 Metrics (structured logging → Vercel Analytics or Axiom)

```
  METRIC                          │ TYPE       │ ALERT THRESHOLD
  ────────────────────────────────┼────────────┼─────────────────────
  simulation.created              │ counter    │ —
  simulation.completed            │ counter    │ —
  simulation.failed               │ counter    │ > 5% of total
  run.completed                   │ counter    │ —
  run.validation_failed           │ counter    │ > 5% per sim
  conservation.violation          │ counter    │ > 0 (P0 PAGE)
  llm.call                        │ counter    │ —
  llm.call.latency                │ histogram  │ p99 > 10s
  llm.call.error                  │ counter    │ > 10% rate
  llm.cache.hit_rate              │ gauge      │ < 50%
  llm.cost.per_simulation         │ gauge      │ > $5
  queue.depth                     │ gauge      │ > 100
  queue.job.retry                 │ counter    │ > 10% rate
  pdf.export.duration             │ histogram  │ p99 > 60s
  sse.connection.active           │ gauge      │ —
```

### Debuggability
Every simulation run stores in its JSONB `result`:
- Full event log (every agent action, every constraint check, every state change)
- Every LLM prompt + response (for debugging agent behavior)
- Every heuristic fallback invocation
- Conservation check results at every time step

Given a run ID, an engineer can reconstruct the exact sequence of events.
