# Lab Studio Members App

Production Next.js app for the Lab Studio members experience: onboarding, workouts, nutrition, progress tracking, shop checkout, and Toby AI coaching.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Launch Check

```bash
npm run check:launch
```

This runs lint plus a production build.

## Required Environment Variables

Copy `.env.example` to `.env.local` and set, at minimum:

- `NEXT_PUBLIC_SITE_URL`
- `LABSTUDIO_ACCESS_CODE`
- `LABSTUDIO_SESSION_SECRET`
- `DATABASE_URL`

If you use payments or AI features, also set:

- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY` or the Toby wrapper / Ollama variables
- `USDA_FDC_API_KEY` for food search
- `LABSTUDIO_BOOKINGS_ICAL_URL` if you want live agenda ingestion

## Production Notes

- Sessions are signed with `LABSTUDIO_SESSION_SECRET` in production.
- Stripe checkout redirects use `NEXT_PUBLIC_SITE_URL` or the deployed host; do not leave this unset for production.
- Private member routes are protected by `src/proxy.ts`.
- Metadata, `robots`, `sitemap`, and `manifest` are implemented under `src/app/`.

## Toby AI Provider Config

Toby can run against OpenAI, direct Ollama, or a wrapper API.

- `TOBY_AI_PROVIDER=openai|ollama|wrapper|auto` (`auto` uses wrapper URL if set, otherwise Ollama/OpenAI routing)
- `TOBY_MODEL=<model>` default model for OpenAI
- `OLLAMA_BASE_URL=http://<host>:11434` base URL for your Ollama machine (or API gateway)
- `OLLAMA_URL=http://<host>:11434` alias for `OLLAMA_BASE_URL`
- `OLLAMA_MODEL=<model>` model override when provider is Ollama
- `OLLAMA_API_KEY=<token>` optional bearer token when Ollama is behind auth
- `OLLAMA_TOOLS_ENABLED=true` optional: allow tool-calling attempt on Ollama in `/api/toby/chat`
- `TOBY_CHAT_WRAPPER_URL=http://host/api/toby/chat` Toby wrapper endpoint (if you provide only host, `/api/toby/chat` is appended automatically)
- `TOBY_CHAT_WRAPPER_API_KEY=<token>` optional bearer token for wrapper auth
- `TOBY_CHAT_WRAPPER_ACCESS_CODE=<code>` optional `x-labstudio-key` header forwarded to wrapper
- `TOBY_CHAT_WRAPPER_CF_ACCESS_CLIENT_ID=<id>` optional Cloudflare Access service token client id
- `TOBY_CHAT_WRAPPER_CF_ACCESS_CLIENT_SECRET=<secret>` optional Cloudflare Access service token client secret
- `TOBY_CHAT_WRAPPER_TIMEOUT_MS=25000` optional wrapper timeout in milliseconds
- `TOBY_WRAPPER_STRICT=true` optional: if `true`, wrapper errors are returned directly (no fallback). Default is fallback to OpenAI/Ollama.

Example local wrapper setup:

```bash
TOBY_AI_PROVIDER=wrapper
TOBY_CHAT_WRAPPER_URL=http://localhost:3002/api/toby/chat
```

For production, `localhost` is not reachable from serverless functions. Set `TOBY_CHAT_WRAPPER_URL` to a public URL.
