# Deploy Lucid to Vercel (2 minutes)

## Option A: Vercel CLI (fastest)

Open terminal, then:

```bash
cd path/to/Lucid-App
npm install
npm install -g vercel
vercel
```

It will ask you to log in (creates a free account if you don't have one), then auto-detects Vite and deploys. Done — you'll get a live URL.

## Option B: GitHub + Vercel (recommended for ongoing updates)

1. Push the Lucid-App folder to a new GitHub repo:
   ```bash
   cd path/to/Lucid-App
   git init
   git add .
   git commit -m "Initial Lucid app"
   gh repo create lucid-app --public --push --source=.
   ```

2. Go to https://vercel.com → Sign up with GitHub → "Import Project" → select your lucid-app repo

3. Vercel auto-detects Vite. Click "Deploy". Done.

Every future `git push` auto-deploys.

## After deploying

1. Your app is live at `https://lucid-app-yourusername.vercel.app`
2. Go to Vercel dashboard → Settings → Domains → Add your custom domain
3. Recommended domains: `getlucid.app`, `uselucid.com`, `dreamlucid.app`

## Then configure the backend

1. **Supabase** → Dashboard → Authentication → URL Configuration:
   - Set Site URL to your Vercel URL
   - Add it to Redirect URLs

2. **Anthropic API key**: Go to Supabase → Edge Functions → Secrets:
   - Add `ANTHROPIC_API_KEY` = your key from console.anthropic.com

3. **Stripe** (when ready for payments):
   - Create product at dashboard.stripe.com ($8.99/mo recurring)
   - Add `STRIPE_SECRET_KEY` to Supabase secrets
   - Update `price_YOUR_STRIPE_PRICE_ID` in App.jsx with real Price ID
   - Add webhook endpoint: `https://nzystepeolxxguouwbkp.supabase.co/functions/v1/stripe-webhook`
