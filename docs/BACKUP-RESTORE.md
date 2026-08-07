# Backup and Restore Guide

This private internal application stores local development data in `prisma/dev.db` and private files in `storage/uploads/` and `storage/contracts/`. All three locations are intentionally ignored by Git and must be backed up together. In production, the data locations are set by `DATABASE_URL` and `APP_DATA_DIR`.

## Create a backup

1. Stop the application server so SQLite has no active writers.
2. Create a dated backup directory outside the repository.
3. Copy `prisma/dev.db` and the complete `storage/` directory into it.
4. Store the backup in an encrypted location with access limited to authorized staff.
5. Retain multiple dated copies and periodically test a restore on a separate local copy.

Example on macOS:

```bash
cd /Users/peterjacobs/Documents/Codex/2026-08-04/projects-rental-booking-app
BACKUP_ROOT="/Volumes/EncryptedBackup/RentalBooking/2026-08-07"
mkdir -p "$BACKUP_ROOT"
cp prisma/dev.db "$BACKUP_ROOT/"
cp -R storage "$BACKUP_ROOT/storage"
```

Do not put backups inside this repository, commit them to Git, or send them through unencrypted email/chat.

## Restore a backup

1. Stop the application server.
2. Make a safety copy of the current database and contracts before replacing anything.
3. Restore the selected `dev.db` to `prisma/dev.db` and its matching `storage` directory to `storage/`.
4. Run `nvm use`, `npm run db:generate`, and `npm run dev`.
5. Sign in and verify a recent booking plus a protected contract download before relying on the restored data.

Use matching database and private-file backups. Database records can reference opaque image or PDF filenames that will be unavailable if the matching `uploads/` or `contracts/` directory is not restored.

## PWA decision

PWA installation and offline caching are intentionally deferred. This app contains private customer and contract data, so an offline service-worker cache requires a dedicated privacy, device-security, and cache-invalidation review before it can be enabled safely.
