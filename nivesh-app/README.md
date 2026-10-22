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

## What works now
Market overview (indices, gainers/losers, sector trends), watchlist, screener (sector / direction filters),
"Where can I invest?" by amount (education only), lessons, 7-day trial and paywall (test mode).

## Before public launch (not done yet)
- Replace the Yahoo Finance provider (`src/data/yahoo.ts`) with a licensed delayed/EOD data vendor or broker API. Yahoo's public endpoint is unofficial and not licensed for a paid app; it is for development/testing only.
- Real payments via Google Play Billing + server-side verification (`src/store.ts` unlock is test-only).
- AI explainer via a backend that holds the API key (never ship the key in the app).
- Privacy policy, Play Store listing, final app name / trademark check, disclaimer review.
- Not investment advice; no return guarantees; no "buy this stock" signals without SEBI registration.
