# Import Plan: users.sql Migration

This document outlines the strategy for converting and importing the legacy `users.sql` file containing existing Surau Al-Ikhwan members into the new Cloudflare D1 SQLite database.

---

## 1. Safety & Verification Rules

1. **Isolation:** The original `users.sql` file must remain untouched and never committed to Git.
2. **Analysis First:** Run analysis scripts first, write findings to `docs/import-analysis.md` before converting anything.
3. **No Automatic Import:** Imports must run against local D1 environments first. Remote imports require explicit user approval.
4. **No Password Generation:** Imported accounts must not receive arbitrary passwords. They remain `unclaimed` until the member completes the `/tuntut-akaun` (Account Claim) flow.

---

## 2. Analysis & Extraction Pipeline

When `users.sql` is provided:
1. Run `scripts/analyse-users-sql.ts` to identify the source schema (table names, columns, encodings, nullability, formats).
2. Look for anomalies:
   - Duplicate IC numbers.
   - Non-12-digit IC formats (e.g. with hyphens, letters, or missing digits).
   - Ages outside the 18–90 range based on calculated birth date.
   - Invalid phone number lengths or formats.
3. Generate two error CSVs for user inspection:
   - `output/import-errors.csv` (invalid format, invalid age, parsing failure).
   - `output/import-duplicates.csv` (duplicate ICs or usernames).
4. Save the detailed findings in `docs/import-analysis.md`.

---

## 3. Data Transformation & Mapping Rules

| Legacy Field | Target Field | Transformation Rule |
| :--- | :--- | :--- |
| `id` / `legacy_id` | `legacy_id` | Keep original primary key for tracing. |
| `name` / `full_name` | `full_name` | Trim whitespace. Capitalize words. |
| - | `full_name_normalized` | Upper-case, stripped of multiple spaces. |
| `ic` / `ic_number` | `ic_normalized` | Remove hyphens, spaces, check length is 12 digits. |
| - | `ic_last4` | Extract last 4 digits of normalised IC. |
| - | `birth_date` | Derive YYYY-MM-DD from IC first 6 digits. Validate century. |
| `phone` / `tel_no` | `phone_normalized` | Clean space, parse using international format (e.g. `+60`). |
| `address` | `address` | Standardize whitespace, trim. |
| - | `membership_status` | Default: `active` if valid; `needs_review` if invalid or duplicated. |
| - | `account_state` | Default: `unclaimed`. |
| - | `directory_visible` | Default: `0` (hidden). |
| - | `registration_source`| Default: `legacy_import`. |

---

## 4. Normalisation & Age Validation Details

- **Century Resolution:** Parse the first 6 digits of the IC (`YYMMDD`).
  - E.g. `050412` -> Birth date could be April 12, 1905, or April 12, 2005.
  - Calculate age for both centuries. Keep the century that yields an age between 18 and 90 relative to the current date in Kuala Lumpur.
  - If neither fits, or if the birth date is invalid (e.g. Feb 30), mark the record status as `needs_review`.
- **Malaysian Phone Numbers:**
  - Standardise prefix (e.g. `0123456789` -> `+60123456789`). Ensure formatting matches international standards.

---

## 5. Deduplication and Conflict Handling

1. **IC Deduplication:** Normalised IC is the primary key. If two rows have the same IC:
   - The first valid record is imported.
   - The duplicate is written to `output/import-duplicates.csv` and excluded from the main table.
   - The status of the imported row is flagged as `needs_review` so an administrator can manually review.
2. **Username Deduplication:** (If usernames exist in legacy dataset).
   - Normalize to lowercase. Prevent duplicates by creating custom suffixes or flagging for admin review.

---

## 6. Rollback & Recovery Plan

- Prior to import, create a SQLite database backup or migration checkpoint.
- If importing on Cloudflare Remote, run a backup script or retain a list of inserted IDs.
- Create a rollback script to delete all rows in D1 where `registration_source = 'legacy_import'`.
- Command to purge imported records:
  ```sql
  DELETE FROM members WHERE registration_source = 'legacy_import';
  ```
