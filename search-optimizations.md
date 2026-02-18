# Search Optimizations Playbook

This document explains the exact search optimization method used in this project, and how to reuse it in any other module/table.

## Scope

- Stack: Next.js API route + Neon Postgres.
- Search target: Multiple product tables unified into one universal search endpoint.
- Requirement: Fast matching with robust query normalization (for example: `pi4`, `pi 4`, `pi-4`, `pi_4`, `pi/4` should match the same products).

## Core Technique

We use a **dual-path search strategy**:

1. Standard match path:
- Lowercase searchable text and use `LIKE '%query%'`.

2. Compact match path:
- Remove separators from searchable text and query, then use `LIKE '%compact_query%'`.
- Separators removed globally: spaces, `/`, `_`, `.`, `-`.

This solves token separator inconsistencies without custom per-word hacks.

## Why This Works

- Users type variants: `pi4`, `pi 4`, `pi-4`, etc.
- Data may contain mixed formatting.
- Compact normalization makes these variants equivalent.
- Trigram GIN expression indexes make substring search scalable.

## Backend Pattern (Reusable)

Current implementation file:
- `app/api/universal-search/route.ts`

### 1. Build a section config instead of hardcoding SQL repeatedly

Use a list of table configs with:
- `tableName`
- `routePath`
- display expressions (`titleExpr`, `subtitleExpr`, `imageExpr`, `priceExpr`, `quantityExpr`)
- `searchableExpr` (lowercase concatenation of search fields)

This keeps all tables under one consistent search contract.

### 2. Normalize incoming query

- `normalizedQuery = query.toLowerCase()`
- `compactQuery = normalizedQuery.replace(/[ /_.-]+/g, "")`
- `escapedLike = '%' + escapeLike(normalizedQuery) + '%'`
- `escapedCompactLike = '%' + escapeLike(compactQuery) + '%'`

`escapeLike` should escape `\\`, `%`, and `_`.

### 3. Use typed SQL parameters

Use explicit casts in SQL to avoid Postgres parameter inference errors:
- `$1::text` for normal like pattern
- `$2::int` for optional numeric ID match
- `$3::text` for compact like pattern
- `$4` for limit

### 4. Use one union query for all tables

Per table, use this predicate shape:

```sql
WHERE (
  (searchable_expr) LIKE $1::text
  OR (
    $3::text IS NOT NULL
    AND REGEXP_REPLACE((searchable_expr), '[[:space:]/_.-]+', '', 'g') LIKE $3::text
  )
  OR ($2::int IS NOT NULL AND id = $2::int)
)
```

And order with ID priority first:

```sql
ORDER BY
  CASE WHEN $2::int IS NOT NULL AND id = $2::int THEN 0 ELSE 1 END,
  table_key ASC,
  id ASC
LIMIT $4
```

## Database Pattern (Reusable)

## Required extension

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Index strategy

For each searched table, create two GIN trigram expression indexes:

1. Standard text index:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table>_universal_search_trgm
ON public.<table>
USING gin ((LOWER(<concatenated_fields>)) gin_trgm_ops);
```

2. Compact text index:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table>_universal_search_compact_trgm
ON public.<table>
USING gin ((REGEXP_REPLACE(LOWER(<concatenated_fields>), '[[:space:]/_.-]+', '', 'g')) gin_trgm_ops);
```

## Why two indexes

- Standard index supports normal substring matching.
- Compact index supports separator-insensitive matching.
- Both are expression indexes aligned with query expressions.

## Important operations notes

- Use `CREATE INDEX CONCURRENTLY` in production to minimize lock impact.
- Run `ANALYZE` after creating indexes so planner statistics are fresh.

```sql
ANALYZE public.<table>;
```

## Neon MCP Workflow Used

Project/branch used for this rollout:
- Project: `lucky-cake-97066376`
- Branch: `br-spring-thunder-a5mpotww` (main)
- DB: `neondb`

Applied via MCP tools:
- `mcp__neon__run_sql` for DDL/index creation.
- `mcp__neon__run_sql_transaction` for batched `ANALYZE`.
- `mcp__neon__run_sql` with `EXPLAIN (ANALYZE, BUFFERS)` for verification.

## Validation Checklist (Use Every Time)

1. Functional checks:
- Search `pi4`
- Search `pi 4`
- Search `pi-4`
- Search `pi_4`
- Search `pi/4`

All should return equivalent result sets for same intent.

2. Query plan checks:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM public.<table>
WHERE REGEXP_REPLACE(LOWER(<concatenated_fields>), '[[:space:]/_.-]+', '', 'g') LIKE '%pi4%'
LIMIT 20;
```

Expect to see `Bitmap Index Scan` on `idx_<table>_universal_search_compact_trgm` for selective inputs.

3. API behavior checks:
- Empty query returns empty list quickly.
- Numeric query prioritizes exact `id` rows.
- No SQL errors related to parameter types.

## Known Behavior and Tradeoffs

- Very short terms (for example `a`, `pi`) can still prefer sequential scans depending on selectivity and table size.
- That is normal planner behavior when an index would not be cheaper.
- As data grows, trigram indexes become more beneficial.

## Common Failure Modes and Fixes

1. Error: `could not determine data type of parameter $N`
- Cause: untyped nullable parameters.
- Fix: cast placeholders (`$1::text`, `$2::int`, etc.).

2. Error: `syntax error at or near UNION`
- Cause: broken parentheses in one `WHERE` branch.
- Fix: validate every union block has balanced parentheses.

3. No results for `pi4` but results for `pi 4`
- Cause: only standard path enabled.
- Fix: add compact query + compact expression path.

4. Slow search after index creation
- Cause: stale stats.
- Fix: run `ANALYZE` on affected tables.

## Reuse Template for Any New Table

When adding a new searchable table:

1. Add one section entry in `SEARCH_SECTIONS` with proper expressions.
2. Create two indexes (`_trgm` and `_compact_trgm`) for that table.
3. Run `ANALYZE` on that table.
4. Test with separator variants and numeric id.

## Security and Quality Notes

- Keep using parameterized SQL (never interpolate user query directly into SQL text).
- Escape LIKE special chars in user query (`%`, `_`, `\\`).
- Keep limit bounded (already capped at 80).

## Summary

This optimization is a reusable pattern:
- Normalize input.
- Search both standard and compact forms.
- Back each form with matching trigram expression indexes.
- Type SQL placeholders explicitly.
- Verify with `EXPLAIN` and real query variants.

It is now production-ready for current product tables and can be copied to any future search endpoint.
