# Nivesh (working name)

Free-to-install Android app (Expo / React Native, TypeScript) for stock-market education and tracking.
7-day free trial, then a paid subscription.

## Run on your phone
1. Install **Expo Go** from Google Play.
2. On a computer with Node 20+: `cd nivesh-app && npm install && npx expo start`
3. Scan the QR code with Expo Go. (Phone and computer on the same Wi-Fi.)

## Build an installable APK
`npx eas-cli build -p android --profile preview` (needs a free Expo account).

## Data
Prices come from Yahoo Finance (delayed ~15 min). If the network/API fails the app falls back to clearly labelled SAMPLE data. Force sample data with `EXPO_PUBLIC_USE_SAMPLE_DATA=1`. Results are cached for 60 s.

## AI explainer (server/)
The app never holds the Anthropic key. `server/` is a small Node/TypeScript API (`POST /explain`) that calls Claude with a guardrail
system prompt (explain concepts only; no personalised advice, no price/return predictions, replies in English/Hindi/Telugu).
It validates input, rate-limits (30 questions/hour/IP, 2000/day overall), and turns refusals into a friendly message.

```
cd server && npm install
cp .env.example .env   # set ANTHROPIC_API_KEY and APP_KEY, then export them (or set in your host dashboard)
npm test               # unit tests (no network needed)
npm start              # listens on :8787
```
Then, for the app, create `nivesh-app/.env`:
```
EXPO_PUBLIC_API_URL=https://your-server.example.com
EXPO_PUBLIC_APP_KEY=<same APP_KEY>
```
Deploy `server/` to any Node host (Render, Railway, Fly.io, Cloud Run). Model defaults to `claude-opus-5-5`
(`CLAUDE_MODEL=claude-haiku-5-5` is much cheaper per question). Monitor spend in the Anthropic Console.

## What works now
Market overview (indices, gainers/losers, sector trends), watchlist, screener (sector / direction filters),
"Where can I invest?" by amount (education only), lessons, 7-day trial and paywall (test mode).

## Before public launch (not done yet)
- Replace the Yahoo Finance provider (`src/data/yahoo.ts`) with a licensed delayed/EOD data vendor or broker API. Yahoo's public endpoint is unofficial and not licensed for a paid app; it is for development/testing only.
- Real payments via Google Play Billing + server-side verification (`src/store.ts` unlock is test-only).
- Replace the shared `APP_KEY` with real entitlement checks (Google Play purchase verification) so only trial/paid users can use the AI explainer. A key bundled in the app can be extracted.
- Host the server (see below) and set the app's `EXPO_PUBLIC_API_URL`.
- Privacy policy, Play Store listing, final app name / trademark check, disclaimer review.
- Not investment advice; no return guarantees; no "buy this stock" signals without SEBI registration.
