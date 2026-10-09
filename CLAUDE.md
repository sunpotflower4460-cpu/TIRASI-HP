# Claude Code project instructions — TIRASI-HP

## Mission and source of truth

This repository is a React/TypeScript/Vite event website and flyer generator. Its v2 plan improves reliability and adds genuinely different flyer layouts, including 1980s Japanese live-house / city-pop / neon-stage / risograph styles.

**Before making changes, read these four documents in full:**

1. [Architecture, requirements, bug review, test criteria](docs/TIRASI_V2_ARCHITECTURE_AND_FLYER_STUDIO.md)
2. [Second-pass design audit and mandatory implementation contracts](docs/V2_DESIGN_AUDIT_AND_CONTRACTS.md)
3. [Long-running execution playbook for Haiku 5.5](docs/HAIKU55_EXECUTION_PLAYBOOK.md)
4. [Implementation status and session handoff](docs/IMPLEMENTATION_PROGRESS.md)

**Implementation detail supplement:** [v2.1 concrete scene/export/migration proposals](docs/V2_DESIGN_AUDIT_AND_DECISIONS.md). Read when implementing corresponding modules. It does not override the canonical DA-01..DA-23 contracts. If the two audits disagree, follow the DA contracts, record the contradiction, and do not silently change scope.

If these documents conflict with repository code, investigate and update the status log with evidence; do not silently discard requirements. Re-check current `origin/main`, open PRs, working-tree changes and CI before implementation.

**As of 2026-10-09, only design documents have been added. v2 code implementation has NOT started.** The presence of this file is not an instruction to begin implementation without an explicit user request.

## Execution policy once implementation is requested

- Do not make a stream of tiny PRs. Target **two substantial PRs**: (A) reliability, migration, separation of public content and drafts, export consistency; (B) flyer studio with 20 distinctive layouts, 12+ palettes, images, and multiple output sizes.
- Within each PR, commit at meaningful checkpoints and update `docs/IMPLEMENTATION_PROGRESS.md` with branch/HEAD, changed files, test results, remaining risks and the next action.
- A pending review/merge for PR-A is **not** a reason to abandon PR-B: create a stacked branch based on PR-A when safe, keep the dependency clear and reconcile it after PR-A merges. Do not auto-merge or auto-deploy.
- Preserve all existing event information, current web pages, legacy event-library JSON, local drafts and the existing A4 design while migrating.
- The Studio must support three document modes: `event-flyer`, `free-flyer`, and `image-treatment`. Never make Open Mic/schedule mandatory for a free-form flyer. Keep an explicit draft-preview route separate from published `/flyer`.
- The **shared layout contract**, not necessarily a single DOM renderer, is the source of truth across preview, PNG and print; HTML-to-canvas CSS support is incomplete. Respect renderer capability flags, output dimensions, and storage/backup safeguards from DA-01..DA-23.
- **Drafts are not published pages**. Do not imply a browser-local edit changes the public site.
- **Client-side passcodes are not real authentication**. Never represent them as a security boundary.
- No paid AI APIs, hosted DB, new auth service, external image storage, automated deployment or secrets unless the user explicitly approves.
- Treat imported JSON and URLs as untrusted. Validate before use, avoid silent data loss, and provide recoverable errors.
- In flyers, changing a palette is not the same as selecting a new layout. All 20 advertised templates must have demonstrably different composition. Reuse shared primitives, not one composition with 20 names.
- Keep A4 visual preview, PNG, and print/PDF tied to one layout specification. Never hide overflow and call export successful.
- The app is currently client-side and works without generative AI. Vintage/retro filters and template effects should be achievable locally; do not promise image-to-image generative redrawing without an implemented, explicitly approved provider.
- Do not copy or commit images supplied only in the conversation unless they have actually been added to this repository with permission.
- Read official docs and verify browser behavior where needed; avoid claims of testing that were not actually measured.

### Canonical audit precedence

The only authoritative detailed audit contract is `docs/V2_DESIGN_AUDIT_AND_CONTRACTS.md` (DA-01 through DA-23). `docs/V2_DESIGN_AUDIT_AND_DECISIONS.md` is supplemental reference material, not an alternative source of truth. The official persisted CreativeDocument discriminants are `event-flyer`, `free-flyer`, and `image-treatment`.

Before PR-A: read DA-18 (transactional migration / recovery), DA-20 (published versus draft navigation), DA-21 (React state transitions), and DA-23 (do not invent a new event or mistake historical vol.6 for a current schedule). Before PR-B: read DA-19 (template switching without losing user edits) and DA-22 (80 render combinations, screen/PNG evidence). Large PRs remain exactly PR-A and PR-B unless user explicitly changes that policy.

## Working loop

1. **Reconcile:** check status, branch, latest main, PRs, docs and outstanding work.
2. **Plan:** pick a coherent task and precise acceptance criterion.
3. **Implement:** write a small tested portion of a large PR (not a separate PR).
4. **Verify:** `npm run build` and all existing automated tests; verify browser/PNG/print when available. Do not claim omitted tests passed.
5. **Checkpoint:** commit only intended files and record tests, blockers, next steps in the progress file.
6. **Continue:** work safely through the planned scope; stop only for real blockers or approvals.

When context resets or CLI usage pauses, begin again from `docs/IMPLEMENTATION_PROGRESS.md` and `git status`, not chat memory. Never overwrite uncommitted user work.

## Run commands

Current baseline: `npm install`, `npm run dev`, `npm run build`, `npm run preview`. The existing CI only tests builds. After introducing a lockfile and test scripts, use `npm ci`, unit tests, browser smoke tests and representative PNG/A4 visual regression tests.

## Final status reporting

Report what was *actually* committed, the PRs' URLs/base branches, how many unique layouts and palettes are truly implemented, tested output sizes, migration compatibility, tests run and results, known issues, and whether main/deployment remains unchanged.
