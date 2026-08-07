# Testing Strategy

Milestone 1 adds Prettier, Vitest, and Playwright. Unit tests cover pricing, fixed/percentage discount exclusivity, deterministic tax, deposit exclusion from revenue, dates, configured-timezone upcoming logic, dashboard revenue/customer metrics, email duplicate warning, bundle snapshots, and contract view models. Integration coverage includes unauthorized rejection, first-admin behavior, customer duplicate warning, product/bundle/booking creation, and contract authorization. Use isolated SQLite databases and fictional fixtures.

Keep one reliable E2E path: sign in; select/create customer; create product and bundle; create booking; add bundle/service; verify total; generate/verify contract; change status. Include mobile-navigation coverage when practical.

Catalog unit coverage validates price/quantity and filter input constraints. Manual catalog testing covers a product with a valid photo, an invalid photo type or oversized file, bundle component quantity/order edits, archive/restore, and Catalog search/filter behavior.

Before every milestone review run formatter, format check, lint, typecheck, unit/integration tests, E2E tests when configured, and production build. Fix failures or report the blocker; never claim unrun checks pass.
