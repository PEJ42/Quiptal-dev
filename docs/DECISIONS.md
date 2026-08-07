# Architecture Decisions

| Decision                                | Rationale                                                      | Status                   |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| SQLite locally, PostgreSQL-ready design | Small MVP setup with a future migration path                   | Proposed for Milestone 1 |
| Integer cents                           | Prevent floating-point currency errors                         | Accepted                 |
| Date-only rental periods                | The MVP has no booking times                                   | Accepted                 |
| Configurable rows, not enums            | Categories, statuses, types, and services are editable         | Accepted                 |
| Immutable snapshots                     | Catalog changes cannot rewrite bookings/contracts              | Accepted                 |
| Archival normal deletion                | Preserves history and auditability                             | Accepted                 |
| Server actions plus handlers            | Simple authenticated mutations; handlers fit files/downloads   | Accepted                 |
| One functioning Admin role              | Secure small-business MVP while retaining future extension     | Accepted                 |
| One discount mode                       | A booking has fixed or percentage discount, never both         | Accepted                 |
| Tax calculation                         | Allocate discount to taxable subtotal before cent tax rounding | Accepted                 |

Open Milestone 1 decisions: select the maintained credentials-auth package and PDF library only after compatibility review. Contract legal text must be editable via Settings before contract implementation.

## Environment risk

`nvm` is installed at `~/.nvm`, but the current `~/.zshrc` only tries the unavailable Homebrew loader and does not source `~/.nvm/nvm.sh`. Interactive shells therefore select Homebrew Node 26.6.0 instead of the project-pinned Node 24.19.0. Correcting that user-profile file requires explicit approval because it is outside this repository. Until then, project commands must explicitly source `~/.nvm/nvm.sh` and run `nvm use`.
