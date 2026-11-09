# Brundavanam Totalu Website

Next.js + Supabase (database, login, file storage) + Open-Meteo (free weather & air quality). Hosted on Vercel. All free tiers.

## 1. Supabase (free)
1. Sign up at supabase.com → **New project**.
2. **Authentication → Providers → Email**: turn OFF "Allow new users to sign up" (after step 4).
3. **Authentication → Users → Add user**: create *your* admin email + password (tick "Auto confirm").
4. Open `supabase.sql`, replace `YOUR_ADMIN_EMAIL` with that same email, paste into **SQL Editor → Run**.
5. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. GitHub
Create a GitHub repo and upload this folder's contents (don't upload `.env.local`).

## 3. Vercel (free Hobby plan)
1. vercel.com → **Add New → Project** → import the repo.
2. Add Environment Variables (see `.env.example`):
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_PLACE, NEXT_PUBLIC_LAT, NEXT_PUBLIC_LON
3. **Deploy**. Your site is live at `your-project.vercel.app`.

## Using it
- Visit `/admin`, sign in, publish updates, photos, videos, blogs. Delete from the same page.
- Weather (temperature, humidity, AQI) shows top-right and refreshes every 15 minutes.

## Run locally (optional)
```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```
