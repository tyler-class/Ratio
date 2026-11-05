# Ratio

A calm coffee brewing log you host yourself. Track the bags you buy, log every brew in a few taps, rate it, and let the patterns tell you what to grind, pour and buy next.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tyler-class/ratio)

- **Log a brew in seconds.** Pick the bag and Ratio fills in your last recipe: grind, dose, ratio, temperature. Lock the ratio and the water follows the dose. Rate it now or later.
- **Dial in.** Each bag shows how every grind setting rated, your best recipe, and last time’s “next time” note.
- **Every bag, start to finish.** Ordered → resting or freezing → drinking → finished, with dates stamped as you go. See grams left, cups left, cost per cup, and how long your stock will last.
- **Photos.** Snap the bag and the roaster’s logo. Images are resized on your phone and stored in your own R2 bucket.
- **Insights.** A brewing calendar, ratings by origin, process, roaster, method or grinder, which ratios rate best, how your dial-in is trending, top bags, an order again shortlist and spend by roaster.
- **AI assistants.** Connect Claude, ChatGPT or any MCP-capable assistant and talk to your log: “log a V60 of the Kenya, 8 out of 10, a bit sour”, “what grind worked best for the Hologram?”, “move the Gesha out of the freezer”.
- **Built for phones.** Install it to your home screen. It works like an app, and the last-loaded log stays readable offline.
- **Yours.** It runs on your own Cloudflare account. The free plan is plenty. Your data stays in your database.

One deployment is one coffee log.

## Deploy

### One click

1. Click **Deploy to Cloudflare** above and sign in to Cloudflare (a free account works).
2. Cloudflare copies this repo to your GitHub or GitLab account, creates the database, image bucket and key-value store, and asks for **APP_PASSWORD**. That’s the password you’ll sign in with. Pick something long.
3. When the deploy finishes, open the `*.workers.dev` link, sign in, and add your first bag.

The deploy runs the database migrations for you (`npm run deploy`).

### By hand

```sh
git clone https://github.com/tyler-class/ratio.git && cd ratio
npm install
npx wrangler login
npx wrangler secret put APP_PASSWORD
npm run deploy
```

`npm run deploy` builds the app, deploys the Worker and applies migrations to the remote database. Wrangler creates the D1 database, the R2 bucket (`ratio-images`) and the KV namespace on the first deploy. If your Wrangler version asks you to create them yourself, run `npx wrangler d1 create ratio`, `npx wrangler r2 bucket create ratio-images` and `npx wrangler kv namespace create OAUTH_KV`, then add the ids it prints to `wrangler.jsonc`.

## Use it on your phone

Open your Ratio link on the phone, then:

- **iPhone:** in Safari, tap Share, then **Add to Home Screen**.
- **Android:** in Chrome, open the menu and tap **Install app**.

## Connect an AI assistant

Ratio includes an [MCP](https://modelcontextprotocol.io) server at `https://<your-ratio>/mcp`. Open **Settings → Connect an AI assistant** to copy your URL and see steps for Claude, ChatGPT, Claude Code and others. When an assistant connects, Ratio shows a sign-in page; enter your password to approve it. **Disconnect all** in the same place revokes every assistant.

Assistants get these tools:

| Tool                            | What it does                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `coffee_overview`               | What’s open, resting, frozen or coming; recent and unrated brews; stats; equipment; units          |
| `find_beans`, `get_bean`        | Search bags; one bag in full with dial-in table, best and last brew                                |
| `list_brews`, `get_brew`        | Search the journal by bean, method, dates, rating or notes                                         |
| `log_brew`                      | Log a brew; anything not given is copied from that bag’s last brew                                 |
| `update_brew`, `delete_brew`    | Rate or fix a brew (“last”, “#392”); delete by number                                              |
| `add_bean`, `update_bean`       | Add a bag (creating its roaster if new); move it along, mark buy-again, edit details               |
| `list_roasters`, `save_roaster` | Roasters with bags, ratings and spend; add or edit one                                             |
| `coffee_insights`               | Ratings by origin/process/roaster/method/grinder/variety, ratio sweet spots, order again shortlist |
| `photo_upload_link`             | A one-time link (30 min) to take or pick a photo on your phone for a bag or logo                   |
| `add_photo`                     | Attach an image from a public URL (e.g. a roaster’s logo) or base64 data                           |

Assistants can’t pass a photo from the chat into a tool, so for “add this photo to the Sumatra” they give you an upload link to tap instead; the photo lands on the bag as soon as it uploads. Names can be loose (“the kenya”, “sey gachatha”); when a name is ambiguous the assistant is told the options. Times without an offset are read in your time zone, which the app reports automatically.

## Change the password

Set a new `APP_PASSWORD`, either in the Cloudflare dashboard under **Workers & Pages → ratio → Settings → Variables and Secrets**, or with:

```sh
npx wrangler secret put APP_PASSWORD
```

Everyone is signed out and signs in again with the new password. Connected AI assistants keep working until you disconnect them.

## Back up and restore

**Settings → Backup → Download backup** saves every roaster, bag and brew as one JSON file. **Restore from backup** replaces everything with a backup’s contents. Photos live in the R2 bucket and aren’t in the file; restoring into the same deployment keeps them attached.

## Update your copy

If you deployed with the button, your copy lives in your own GitHub account. To get new versions, open it on GitHub and click **Sync fork** (or merge from `tyler-class/ratio`). Cloudflare redeploys automatically and runs any new migrations.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars    # then set APP_PASSWORD
npm run db:migrate:local
npm run dev
```

| Script                       | What it does                                       |
| ---------------------------- | -------------------------------------------------- |
| `npm run dev`                | Vite dev server with the Worker running in workerd |
| `npm run build` / `preview`  | Production build / serve the build locally         |
| `npm test`                   | Unit tests and Workers-runtime API tests (Vitest)  |
| `npm run typecheck` / `lint` | TypeScript, ESLint and Prettier                    |
| `npm run deploy`             | Build, deploy, migrate the remote database         |
| `npm run db:migrate:local`   | Apply migrations to the local database             |
| `npm run db:migrate:remote`  | Apply migrations to the deployed database          |

### How it’s built

- **Cloudflare Workers** with static assets. **Hono** serves the API under `/api`. **D1** (SQLite) stores roasters, bags, brews and settings; SQL migrations live in `migrations/`.
- **R2** stores images under keys that mirror their record: `beans/<bean id>/<image id>.jpg`, `roasters/<roaster id>/<image id>.png`. D1 keeps each image’s metadata and order.
- **React**, **TypeScript**, **Vite**, **TanStack Query** and **React Router**, with a service worker from `vite-plugin-pwa`. Phones get bottom tabs and sheets; wider screens get a sidebar and dialogs.
- `src/shared` holds the logic both sides use (usage, stock, runway, dial-in, units, time zones), covered by unit tests.
- Sign-in uses one password per instance: a signed, HttpOnly session cookie, rate-limited attempts, and sessions that end when the password changes.
- AI assistants connect over MCP with OAuth 2.1 (`@cloudflare/workers-oauth-provider`). Tokens are stored in KV. MCP tools call the same API as the app, so validation is shared.

## Support

Ratio is free and built by [Tyler Class](https://tylerclass.net). If you want to say thank you, coffee is my love language: [ko-fi.com/tylerclass](https://ko-fi.com/tylerclass) ☕

## License

[MIT](LICENSE)
