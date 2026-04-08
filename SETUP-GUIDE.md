# Lucid — AI Dream Interpreter

## What's Built

**Frontend (React + Vite PWA)**
- Landing page with hero, features, testimonials, pricing
- Dream interpretation form with loading animations
- Beautiful result cards with psychology, symbols, emotions, mood
- TikTok-optimized share cards
- Auth modal (sign up / sign in)
- Dream journal page
- Fully responsive (mobile-first)

**Backend (Supabase)**
- Project: `nzystepeolxxguouwbkp` (us-east-1)
- URL: https://nzystepeolxxguouwbkp.supabase.co
- Database tables: `profiles`, `dreams` (with RLS policies)
- Auto-creates user profile on signup

**Edge Functions (all deployed & active)**
1. `interpret-dream` — Takes dream text, calls Claude API, saves to DB, enforces free/pro limits
2. `stripe-webhook` — Handles subscription events (checkout, cancel, payment failed)
3. `create-checkout` — Creates Stripe Checkout session with 7-day trial

## Setup Steps (15 minutes)

### 1. Get your API keys

**Anthropic (Claude) API Key** — for dream interpretations:
- Go to https://console.anthropic.com
- Create an API key
- Add it to Supabase: Dashboard → Edge Functions → Secrets → Add `ANTHROPIC_API_KEY`

**Stripe** — for payments:
- Go to https://dashboard.stripe.com
- Create a product: "Lucid Pro" at $8.99/month recurring
- Copy the **Price ID** (starts with `price_`)
- Get your **Secret Key** (starts with `sk_`)
- Add to Supabase secrets: `STRIPE_SECRET_KEY`
- Set up webhook: Stripe Dashboard → Webhooks → Add endpoint:
  - URL: `https://nzystepeolxxguouwbkp.supabase.co/functions/v1/stripe-webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 2. Update the Price ID in code

In `src/App.jsx`, find `price_YOUR_STRIPE_PRICE_ID` and replace with your actual Stripe Price ID.

### 3. Deploy to Vercel (free)

```bash
cd Lucid-App
npm install
npm install -g vercel
vercel
```

Follow the prompts. Your app will be live at a `.vercel.app` URL.

Then buy a domain (e.g., getlucid.app) and connect it in Vercel settings.

### 4. Update Supabase Auth

In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to your domain (e.g., `https://getlucid.app`)
- Add redirect URLs

## Costs (Monthly)

| Service | Cost |
|---------|------|
| Supabase (Free tier) | $0 |
| Vercel (Free tier) | $0 |
| Domain (.app) | ~$12/year |
| Claude API (per interpretation) | ~$0.003 each |
| Stripe fees | 2.9% + $0.30 per transaction |

**At 100 Pro subscribers ($8.99/mo):**
- Revenue: $899/mo
- Claude API: ~$9/mo (3,000 interpretations)
- Stripe fees: ~$56/mo
- **Profit: ~$834/mo**

## File Structure

```
Lucid-App/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── manifest.json
└── src/
    ├── main.jsx
    ├── index.css          # All styles
    ├── App.jsx            # Full app (all components)
    └── lib/
        └── supabase.js    # Supabase client, auth, API helpers
```
