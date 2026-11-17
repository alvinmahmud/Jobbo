# Jobbo

A job-browsing app built with React Native, Expo, and TypeScript. Search and filter job listings, save jobs, and set up a profile manually or by pasting resume text.

The current prototype uses sample job data and stores your profile and saved jobs locally. No backend or API keys are required. Job listings and application links are placeholders, and resume parsing uses local pattern matching.

## Run locally

### Requirements

- Node.js 22 LTS (22.13 or newer) and npm

### Setup

```bash
git clone https://github.com/alvinmahmud/Jobbo.git
cd Jobbo/expo
npm ci
npm run start-web
```

Open the local URL printed in the terminal (usually `http://localhost:8081`). **Run all npm commands from the `expo/` directory**, where `package.json` lives.

### Phone or simulator

```bash
npx expo start --lan
```

Use an Expo Go client compatible with Expo SDK 54 and scan the QR code while your phone and computer are on the same Wi-Fi network. On macOS with Xcode and an iOS Simulator installed, press `i` in the Expo terminal to open the simulator.

If LAN connectivity fails, `npm start` uses an internet-based tunnel instead. If Expo Go reports an SDK mismatch, use the browser or a compatible client.

### Useful commands

Run these inside `expo/`:

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm run start-web`     | Run in a browser                                |
| `npm run start-web-dev` | Run in a browser with the bundler cache cleared |
| `npm start`             | Start Expo with a tunnel                        |
| `npm run lint`          | Run ESLint                                      |
| `npx tsc --noEmit`      | Check TypeScript types                          |

Run `npm test` inside `expo/` to test job normalization, fallback formatting, and filtering. To manually test, search and filter listings, open job details, bookmark and remove jobs, edit your profile, and reload to check local persistence. Browser and native app data are stored separately.

### Job data and fallbacks

`expo/utils/jobs.ts` provides `normalizeJob(raw, stableId)` as the shared boundary for future API adapters. Map an API response or parser output to the app's field names before normalizing it. This validates structured data; it does not yet extract fields from free-text job descriptions.

Missing or invalid data is normalized to `unknown` internally, with unknown salaries stored as `null`, not zero. `getJobDisplay(job)` provides readable labels such as “Company unknown,” “Location unknown,” and “Date unknown.” Cards hide unknown salary/work-type pills and source badges, and missing logos use a briefcase icon. Detail pages show “Salary unknown,” explanatory empty-description/requirements text, and hide empty skills sections. Apply is disabled and labeled “Application link unknown” without a valid HTTP(S) URL. Listings with unknown values appear by default, but do not match explicit filters for those values.

The first sample listing has all content missing to exercise these fallbacks. Search for `unknown` or open `http://localhost:8081/job/unknown-demo` to inspect it. Its internal ID remains stable so navigation and bookmarking still work.

### Troubleshooting

If dependency installation fails with `ENOTEMPTY`, or Expo reports `Permission denied`, stop any running Expo process and reinstall dependencies from `expo/`:

```bash
rm -rf node_modules
npm ci
```

## Known issues

- Type checking currently reports missing `React` imports in `expo/app/+not-found.tsx`.
- Lint currently reports an unescaped apostrophe in the profile screen and a missing component display name in `expo/components/icons.tsx`.
- `expo/app.json` references icon and splash images under `assets/images/`, but those files are not included yet. They need to be added, or the configuration updated, before packaging the app.

## Project structure

```text
expo/
  app/          Screens and Expo Router routes
  components/   Reusable UI
  providers/    App state and local persistence
  mocks/        Sample job listings
  constants/    Theme values
  types/        Shared TypeScript types
```
