 # Forex Price Alert

 A small full-stack Next.js application that monitors forex and precious-metal prices and sends a Telegram notification when an alert target is reached.

 The application does not place trades. It only checks prices, compares them with user-defined targets, and sends notifications.

 ## Features

 - Create price alerts from a dropdown of Twelve Data-compatible symbols.
 - Monitor major forex pairs, popular crosses, gold, and silver.
 - Check prices through the Twelve Data API on the server.
 - Send notifications through the Telegram Bot API.
 - View the last cached price in the browser.
 - Delete active alerts.
 - Run locally with an in-process scheduler or on Vercel with a cron endpoint.
 - Use local mock APIs for development without contacting Twelve Data or Telegram.

 ## Supported symbols

 The UI currently provides these symbols:

 ```text
 EUR/USD   GBP/USD   USD/JPY   USD/CHF
 AUD/USD   USD/CAD   NZD/USD
 EUR/GBP   EUR/JPY   GBP/JPY
 XAU/USD   XAG/USD
 ```

 Symbols use the slash format expected by Twelve Data. For example, use `XAU/USD`, not `XAUUSD`.

 ## Requirements

 - Node.js 18.18 or newer
 - A Twelve Data API key
 - A Telegram bot token
 - A Telegram chat ID

 ## Installation

 ```bash
 npm install
 ```

 Create `.env.local` in the project root:

 ```dotenv
 TWELVE_DATA_API_KEY=your_twelve_data_api_key
 TELEGRAM_BOT_TOKEN=your_telegram_bot_token
 TELEGRAM_CHAT_ID=your_telegram_chat_id
 CRON_SECRET=your_random_private_secret
 ```

 Optional settings:

 ```dotenv
 # Local monitor interval in minutes. Defaults to 2.
 MONITOR_INTERVAL_MINUTES=2

 # Override these only when using local mock services or another compatible endpoint.
 # TWELVE_DATA_BASE_URL=https://api.twelvedata.com
 # TELEGRAM_API_BASE=https://api.telegram.org
 ```

 Never commit `.env.local` or place real API keys and bot tokens in the README. If credentials have been exposed, revoke and replace them.

 ## Run locally

 ```bash
 npm run dev
 ```

 Open [http://localhost:3000](http://localhost:3000).

 The local server starts the price monitor automatically. It performs an initial check shortly after startup and then checks every two minutes by default. Change `MONITOR_INTERVAL_MINUTES` and restart the server to use another interval.

 The browser refreshes the alert list every five seconds, but this does not call Twelve Data. It only reads the prices cached by the server-side monitor.

 ## How monitoring works

 ```text
 active alerts
		 |
		 v
 fetch one price per unique symbol from Twelve Data
		 |
		 v
 compare current price >= target price
		 |
		 v
 send Telegram notification
		 |
		 v
 remove the triggered alert
 ```

 An alert currently triggers when:

 ```text
 currentPrice >= targetPrice
 ```

 A failed price request or Telegram request is logged. If Telegram delivery fails, the alert remains active and is retried during the next check.

 ## API routes

 ### Create an alert

 ```http
 POST /api/alerts
 Content-Type: application/json
 ```

 Request body:

 ```json
 {
	 "pair": "XAU/USD",
	 "price": 3650.5
 }
 ```

 The pair must contain letters with an optional slash, and the target price must be positive.

 ### List active alerts

 ```http
 GET /api/alerts
 ```

 Returns active alerts with the latest cached price and the time it was checked.

 ### Delete an alert

 ```http
 DELETE /api/alerts/{id}
 ```

 ### Run a monitoring cycle

 ```http
 GET /api/cron/check-alerts
 ```

 When `CRON_SECRET` is configured, authenticate with either method:

 ```bash
 curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
	 http://localhost:3000/api/cron/check-alerts
 ```

 or:

 ```bash
 curl "http://localhost:3000/api/cron/check-alerts?secret=YOUR_CRON_SECRET"
 ```

 `CRON_SECRET` is an authorization value. It is not the cron schedule. The schedule is configured separately in `vercel.json`.

 ### Health check

 ```http
 GET /api/test
 ```

 ## Vercel deployment

 Deploy the project to Vercel and configure the environment variables in the Vercel project settings. The repository includes this cron configuration:

 ```json
 {
	 "crons": [
		 {
			 "path": "/api/cron/check-alerts",
			 "schedule": "*/2 * * * *"
		 }
	 ]
 }
 ```

 On Vercel, the in-process timer is disabled because serverless functions do not reliably keep long-running timers alive. Vercel Cron invokes the protected endpoint instead.

 ## Local mock APIs

 The project includes a small mock server for offline development:

 ```bash
 node scripts/mock-apis.mjs
 ```

 It listens on port `4010`. Point the application at it with:

 ```dotenv
 TWELVE_DATA_BASE_URL=http://localhost:4010
 TELEGRAM_API_BASE=http://localhost:4010
 TWELVE_DATA_API_KEY=local-test-key
 ```

 The mock server provides:

 - `GET /price?symbol=...` to return a mock price
 - `GET /__set?symbol=...&price=...` to change a mock price
 - `GET /__log` to inspect Telegram messages received by the mock
 - `POST /bot<TOKEN>/sendMessage` to receive Telegram messages

 ## Project structure

 ```text
 src/
	 instrumentation.ts             Starts the local monitor on server boot
	 app/
		 page.tsx                     Main alert interface
		 api/alerts/route.ts          Create and list alerts
		 api/alerts/[id]/route.ts     Delete an alert
		 api/cron/check-alerts/       Run one monitoring cycle
		 api/test/route.ts            Health check
	 components/
		 AlertForm.tsx                Symbol dropdown and target-price form
		 AlertList.tsx                Active alert list
		 AlertItem.tsx                Individual alert and delete action
	 lib/
		 alert-store.ts               In-memory alert storage
		 price-monitor.ts             Price checks and trigger logic
		 twelve-data.ts               Twelve Data client
		 telegram.ts                  Telegram client
	 types/alert.ts                 Alert types
 scripts/mock-apis.mjs            Local mock Twelve Data and Telegram APIs
 vercel.json                      Vercel Cron configuration
 ```

 ## Data and security limitations

 - Alerts are stored in process memory, not a database.
 - Alerts disappear when the server restarts.
 - Serverless instances do not share alert memory or cached prices.
 - There is no login or user-specific alert ownership.
 - The current trigger direction is only `currentPrice >= targetPrice`.
 - API credentials must remain server-side and should be rotated if exposed.

 ## Available scripts

 ```bash
 npm run dev      # Start the development server
 npm run build    # Create a production build
 npm run start    # Start the production server
 ```
