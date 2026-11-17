# Jobbo

A US job-search app built with React Native, Expo, and TypeScript. Search live jobs, filter loaded results, save listings locally, and set up your profile manually or by pasting resume text.

Live search uses **OpenWeb Ninja JSearch** through a small Node proxy. The provider key stays on the server. Sample jobs are available only in explicit demo mode; failed live searches never silently show mock listings.

## Run locally

### Requirements

- Node.js 22 LTS (22.13 or newer) and npm
- A **direct OpenWeb Ninja JSearch subscription/key**: https://www.openwebninja.com/api/jsearch
- A RapidAPI marketplace key is not interchangeable with this integration's direct-provider key.

### 1. Install and configure

```bash
git clone https://github.com/alvinmahmud/Jobbo.git
cd Jobbo
npm --prefix expo ci
cp .env.example .env
cp expo/.env.example expo/.env
```

Edit the **root `.env`** and set:

```dotenv
OPENWEBNINJA_API_KEY=your_direct_openwebninja_key
```

Keep this key out of chat, source control, and all `EXPO_PUBLIC_*` variables. Both `.env` files are ignored by Git. The Expo file contains **public configuration only**:

```dotenv
EXPO_PUBLIC_JOB_SOURCE=live
EXPO_PUBLIC_JOBS_API_URL=http://localhost:8787
```

### 2. Start the proxy — terminal one

From the repository root:

```bash
npm run api
```

The proxy listens on `127.0.0.1:8787`. It has no npm dependencies. Restart it after changing the root `.env`.

### 3. Start the app — terminal two

From the repository root:

```bash
npm run web
```

Alternatively, run `npm run start-web` inside `expo/`. Open the URL Expo prints, usually `http://localhost:8081`.

Enter a keyword and optional US city/state, optionally enable Remote only, then press **Search** or submit from the keyboard. Opening the app and typing do not trigger provider calls. **Load more** fetches one additional page. Refresh restarts from the first page; a warm proxy cache may serve it without another upstream request.

If the proxy is stopped or the key is missing/rejected, search shows an actionable error. If you are still signing up, the UI can run without a key; live searches will not succeed until the server is configured.

### Demo mode without a key or proxy

Set this in `expo/.env`, then restart Expo:

```dotenv
EXPO_PUBLIC_JOB_SOURCE=demo
```

Sample data includes a missing-fields demo at `/job/unknown-demo`. Search for `unknown` to find it. No provider calls are made in demo mode.

### Phone or simulator

Run `npx expo start --lan` inside `expo/` and use an Expo Go client compatible with SDK 54. On macOS with Xcode and a simulator installed, press `i` in the Expo terminal.

For a **physical phone**, localhost points to the phone, not your computer:

1. Set root `.env` `HOST=0.0.0.0` to allow LAN connections and restart the proxy.
2. Set `expo/.env` `EXPO_PUBLIC_JOBS_API_URL=http://YOUR_COMPUTER_LAN_IP:8787` using your actual address, then restart Expo.
3. Keep both devices on the same trusted Wi-Fi and allow the connection through your firewall.

For the Android Emulator, use `http://10.0.2.2:8787`. For the iOS Simulator, localhost normally works. Expo's tunnel exposes Metro only, not the jobs proxy. LAN HTTP is for local testing; deployed clients need HTTPS.

If Expo chooses another web port, add its exact origin to root `.env` `ALLOWED_ORIGINS` and restart the proxy. Defaults allow `http://localhost:8081` and `http://127.0.0.1:8081`.

## Quota and privacy

- One search page requests `num_pages=1`; the provider documents up to 10 results per page and one request credit per page.
- There are no automatic retries, focus refetches, or startup searches. Identical searches reuse client data; the proxy shares identical in-flight requests and caches successful responses for 15 minutes.
- Proxy limits default to 20 upstream attempts/hour and 30 cache misses/minute/IP. These are local safeguards, **not a monthly spending cap**. Failed upstream attempts count too. Enable provider-side billing limits/alerts.
- Search keywords and locations go to OpenWeb Ninja. Resume text and saved profiles are not sent to the jobs provider.
- Review provider attribution, caching, and redistribution terms before public launch. A 15-minute cache is an implementation default, not a claim about licensing permission.

## Data behavior

`expo/utils/jsearch.ts` maps provider fields into `normalizeJob()` in `expo/utils/jobs.ts`. IDs are stable and route-safe. Missing data retains the existing readable fallback labels, hidden pills, briefcase logos, and disabled Apply behavior.

Salary currency and pay period are preserved when supplied. Unknown periods/currencies are not guessed. Salary filters currently compare **annual USD** listings only; hourly/monthly/non-USD jobs remain visible with Any salary. Other filter-sheet settings apply only to loaded results, not the provider's whole inventory. Source choices come from loaded listings.

Saved jobs store local snapshots, independent of the current search. Legacy mock bookmarks are migrated, but are still sample data. The last loaded result set is also persisted for detail-page reloads. Saved snapshots may become outdated or link to closed jobs; they are not automatically revalidated. Browser and native data are separate.

## Commands and tests

From the repository root:

```bash
npm run api   # Local private-key proxy
npm run web   # Expo web app
npm test      # Mocked proxy tests + app helper/adapter tests; no provider credits
```

Inside `expo/`:

```bash
npm run start-web-dev  # Browser with Metro cache cleared
npm start             # Expo with a Metro tunnel
npm run lint
npx tsc --noEmit
npm test
```

If installation fails with `ENOTEMPTY` or an executable permission error, stop Expo and reinstall from `expo/`:

```bash
rm -rf node_modules
npm ci
```

## Deployment

`api/jobs.mjs` is a Node-compatible serverless entry point; this repository does not provision hosting. Set the secret in your host's server environment and configure the public app API URL and allowed origins.

**Do not expose this local proxy publicly as-is.** Before launch, add application authentication, shared durable rate/spend limits, and HTTPS. Current caches and budgets are per process and reset/multiply across restarts or serverless instances. CORS is not authentication. See `server/README.md` for the proxy contract and configuration.

## Known issues

- Type checking currently reports missing `React` imports in `expo/app/+not-found.tsx`.
- Lint currently reports an unescaped apostrophe in the profile screen and a missing component display name in `expo/components/icons.tsx`.
- `expo/app.json` references icon/splash files that are not included yet; add them or update the configuration before packaging.
- Resume parsing is local pattern matching, not a document-upload service or AI parser.

## Project structure

```text
api/                  Serverless Node entry point
server/               Local proxy, cache, quota guards, and tests
expo/
  app/                Screens and Expo Router routes
  components/         Reusable UI
  providers/          Search, profile, and local persistence state
  services/           Jobs API client
  utils/              Provider adapter, normalization, presentation, resume helpers
  tests/              App helper and adapter tests
  mocks/              Explicit demo data
  constants/          Theme values
  types/              Shared TypeScript types
```
