## Summary

<!-- 1-3 bullet points describing what changed and why. -->

## Changes

<!-- More detailed list if helpful. -->

## Test plan

<!-- How did you verify? Manual smoke test? Automated tests? -->

- [ ] `pnpm typecheck` passes
- [ ] `pnpm dev` opens the app and the affected feature works
- [ ] No regressions in dark/light mode
- [ ] No `console.error` in renderer DevTools

## Privacy / security

- [ ] No new outbound network calls (other than user-triggered GitHub import)
- [ ] No new dependencies that phone home
- [ ] No filesystem writes outside `~/.claude/` and `<userData>/`
- [ ] Renderer still has no Node access (`contextIsolation`, `sandbox` intact)

## Screenshots

<!-- Required for any UI changes. -->
