# TODOS

## P1 — High Priority

### Prompt versioning strategy
**What:** Define and document the LLM prompt versioning strategy — how prompt templates are versioned, how changes are tracked, and how to detect prompt regression.
**Why:** Prompt changes can silently alter agent behavior and invalidate cached decisions. Cache keys must include prompt version hash to auto-invalidate on prompt change. Foundation for Phase 4 certified simulation mode.
**Context:** Each prompt template gets a version hash. Agent decision cache keys include the prompt hash. When a prompt changes, cache misses naturally. Document this before Phase 2 caching goes live (Week 4).
**Effort:** S (2-3 hours)
**Depends on:** Phase 2 caching implementation (Week 4)

## P2 — Medium Priority

### Streaming percentile computation (t-digest)
**What:** Implement t-digest algorithm for streaming approximate percentiles in Monte Carlo aggregation.
**Why:** Naive percentile computation (sort all values) works for 100 runs but OOMs at 10K institutional runs. T-digest computes approximate percentiles in O(1) memory per update. Use Welford's algorithm for mean/variance, t-digest for p5/p25/p50/p75/p95.
**Context:** Phase 2 starts with 100 runs where naive sort is fine. But the aggregator interface should be designed for streaming from day 1. Swap in t-digest when 1K/10K tiers are needed.
**Effort:** M (2-3 days)
**Depends on:** Phase 2 Monte Carlo engine (Week 5)

### LLM fixture recording CLI tool
**What:** Build a CLI command that runs one Quick Scan against the real Claude API and saves all prompt/response pairs as JSON fixtures for the test suite.
**Why:** Test strategy relies on recorded fixtures (12 agents Phase 1, 30+ Phase 2). Manual recording doesn't scale. A CLI tool makes quarterly re-recording trivial: `pnpm record-fixtures --config bihar-agri`.
**Context:** Run against real Claude API, save responses keyed by agent type + scenario. Ensures fixtures match current prompt templates.
**Effort:** S (half day)
**Depends on:** Phase 1 LLM integration (Week 3)

## P3 — Low Priority

### Program templates table in Phase 2 schema
**What:** Add `program_templates` table to Phase 2 DB schema (even if unused until Phase 4 Marketplace).
**Why:** Phase 4 Marketplace needs templates with risk profiles. Having the table early lets us dog-food it with pre-loaded defaults (Bihar agri-subsidy) and avoids a schema migration mid-Phase 4.
**Context:** Empty table, zero cost. Fields: template config, aggregate risk stats, fork count, version, created_by. Include in initial migration.
**Effort:** S (30 minutes)
**Depends on:** Phase 2 DB schema (Week 4)
