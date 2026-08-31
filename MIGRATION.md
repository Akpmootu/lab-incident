# Lab Incident: Supabase → Google Sheets migration

The application now reads and writes incident data through the server endpoint `/api/data`. Google credentials are never bundled into the browser. The Google Sheet contains two tabs: `Incidents` (92 migrated records) and `Edit History` (2 migrated records).

## Production environment variables

Configure these variables in the Vercel project before deploying:

- `GOOGLE_SHEET_ID=1LR-cPwsWpvGjkQ-4jsn3hFWjV0ar7c6qdYHviSi5ajY`
- `GOOGLE_SERVICE_ACCOUNT_JSON=<full service-account JSON>`

Share the spreadsheet with the service account email as **Editor**. Keep the service-account JSON server-only; do not prefix it with `VITE_`.

## Google Sheet

[Open Lab Incident Database](https://docs.google.com/spreadsheets/d/1LR-cPwsWpvGjkQ-4jsn3hFWjV0ar7c6qdYHviSi5ajY/edit)

The `risk_items` and `changes` fields are stored as JSON strings so arrays and edit history remain lossless. The frontend parses them back to their original structures.
