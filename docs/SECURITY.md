# Security Expectations

Use maintained credentials authentication with Argon2id or bcrypt, first-admin setup only while no user exists, HTTP-only Secure production cookies, and login rate limiting where practical. Every protected page/action/handler/upload/download checks authentication and authorization server-side. Validate all external input with Zod; normalize duplicate checks; give safe field errors only.

Validate product/bundle uploads for type/size/content, generate safe names, and never use user-controlled paths. Generated PDFs are outside public assets, stored under opaque non-guessable references, and downloaded only through authorization. Never commit `.env`, databases, uploads, contracts, or private references; `.env.example` contains placeholders only.

Production responses disable the identifying `X-Powered-By` header and set `X-Content-Type-Options`, `X-Frame-Options`, Referrer Policy, and Permissions Policy headers. The application emits a no-index robots rule because this is a private internal tool. Deploy only behind HTTPS. A strict Content Security Policy and offline caching require additional compatibility and private-data review before enabling them.

Use integer cents, immutable booking/contract snapshots, archive rather than normal delete, and booking audit activities with user/time/metadata. Never use real customer, payment, password, or production data in source or development fixtures.
