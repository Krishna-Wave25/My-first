# Google Play Billing setup (one-time, about 1-2 hours + Google review waits)

Code is done: `src/useSubscription.ts` (buy / restore / verify / acknowledge), `server/src/play.ts` (server verifies with Google).
Real purchases only work for an app **installed from Google Play** (internal testing track is enough). The sideload APK cannot buy.

## 1. Play Console
1. Create a Google Play developer account (one-time US$25) and **Create app** (name: Nivesh, free app, package `com.nivesh.app`).
   The package name must match `android.package` in `app.json`. Change both if `com.nivesh.app` is taken.
2. **Monetize -> Subscriptions -> Create subscription**
   - Product ID: **`nivesh_pro`** (must match `SUBSCRIPTION_ID` in `src/billing.ts`)
   - Base plan `monthly` (auto-renewing, 1 month, e.g. ₹149) and optionally `yearly` (e.g. ₹999)
   - Add an **offer** to each base plan: free trial 7 days, "new customer acquisition". Activate everything.
3. **Setup -> App content**: complete privacy policy URL, data safety, financial-features declaration (stock/investing apps need it), target audience.

## 2. Signing and uploading a build
1. Make an upload key once (keep the file safe, back it up):
   `keytool -genkeypair -v -storetype JKS -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. GitHub repo -> Settings -> Secrets and variables -> Actions, add secrets:
   `NIVESH_KEYSTORE_BASE64` (`base64 -w0 upload.jks`), `NIVESH_KEYSTORE_PASSWORD`, `NIVESH_KEY_ALIAS` (upload), `NIVESH_KEY_PASSWORD`
   and (for the AI explainer / verification) `NIVESH_APP_KEY`, plus the variable `NIVESH_API_URL`.
3. Run the workflow. Download the **Nivesh-aab** artifact and upload it to Play Console -> **Testing -> Internal testing** (accept Play App Signing).
4. Add your Gmail under **Testing -> Internal testing -> Testers**, and under **Setup -> License testing** so test purchases are free.
5. Open the internal-testing link on your phone, install from Play, let the trial end (or use Play's test-card behaviour) and subscribe.

## 3. Server verification (recommended before launch)
1. Google Cloud console -> create a project -> enable **Google Play Android Developer API** -> create a **service account** -> create a JSON key.
2. Play Console -> **Users and permissions -> Invite new users** -> paste the service account email -> grant **View financial data** and **Manage orders and subscriptions** for the app.
3. On your server set `GOOGLE_SERVICE_ACCOUNT_JSON` (the whole JSON as one env value), `ANDROID_PACKAGE_NAME=com.nivesh.app`, `PLAY_SUBSCRIPTION_ID=nivesh_pro`, `APP_KEY`.
   Without this the app trusts Google Play's on-device state (short 3-day cache), which a rooted phone could fake.
   (Permissions can take up to ~24h to start working.)

## What is not covered yet
- Real-time developer notifications (Pub/Sub) so cancellations/refunds are known instantly. Today the app re-checks with the server on every start.
- iOS (App Store billing). The library supports it, the app and workflow are Android-only.
