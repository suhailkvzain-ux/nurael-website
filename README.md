# Nurael Abaya — Static Site + Supabase Admin

This version of the site has **no server to run**. It's plain HTML/CSS/JS that talks directly
to [Supabase](https://supabase.com) (a free hosted database) for products and settings, and to
[Vercel](https://vercel.com) (free static hosting) to actually be live on the web. Once it's set
up, updating your site means: log into `/admin`, make a change, done — nothing to run, restart,
or redeploy.

Follow these steps in order. None of them use a terminal.

---

## Step 1 — Create your Supabase project

1. Go to **[supabase.com](https://supabase.com)** and sign up (free).
2. Click **New Project**. Give it any name (e.g. "nurael-abaya"), set a database password
   (save it somewhere), pick any region, and click **Create new project**. Wait ~1 minute for it
   to finish setting up.

## Step 2 — Set up the database

1. In your new project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase/setup.sql` from this folder, copy its entire contents, and paste it
   into the SQL editor.
4. Click **Run** (bottom right). You should see "Success" — this creates your products table,
   settings, an image storage bucket, security rules, and loads your original 12 products.

## Step 3 — Create your admin login

1. In Supabase, click **Authentication** in the left sidebar, then **Users**.
2. Click **Add user** → **Create new user**.
3. Enter the email and password you want to log into `/admin` with, and make sure
   **Auto Confirm User** is switched on. Click **Create user**.

## Step 4 — Connect the site to your Supabase project

1. In Supabase, click the **Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open the file `config.js` in this folder (right-click → Edit, or open with Notepad) and paste
   them in:
   ```
   const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...(a long string)...";
   ```
4. Save the file.

## Step 5 — Put the site online with Vercel

1. Go to **[github.com](https://github.com)**, sign up if you haven't, and create a **New
   repository** (any name, e.g. "nurael-abaya").
2. On the new repository's page, click **uploading an existing file**, then drag in every file
   and folder from this project **except** the `supabase` folder (that one was only needed for
   Step 2). Commit the upload.
3. Go to **[vercel.com](https://vercel.com)**, sign up using your GitHub account (this makes the
   next step one click).
4. Click **Add New… → Project**, choose the GitHub repository you just created, and click
   **Deploy**. Vercel will detect it's a static site automatically — no settings to change.
5. After a minute you'll get a live link like `nurael-abaya.vercel.app`. That's your real website.

## Step 6 — Use the admin panel

Go to `https://your-site.vercel.app/admin/login.html` and sign in with the email/password from
Step 3. From there you can add/edit/delete products, manage stock, upload photos, feature
products on the homepage, and change the homepage cover image and text — every change appears
on the live site immediately.

## Later — pointing nurael.co at this

Once you own the `nurael.co` domain, go to your Vercel project → **Settings → Domains**, add
`nurael.co`, and follow Vercel's instructions to update your domain's DNS records at wherever you
registered the domain. Vercel will show you exactly what to change.

## Making future edits to the code

Whenever you want to change the site's design or add new pages, edit the files and re-upload the
changed ones on your GitHub repository page (**Add file → Upload files**) — Vercel automatically
redeploys within about a minute of any change to the repository.

## Notes

- Supabase's free tier keeps your data indefinitely as long as the project stays active; if a
  project is left completely untouched for 7+ days it may pause and need a click to "resume" from
  the Supabase dashboard — your data is not deleted, just paused.
- Image uploads go to Supabase Storage (the `product-images` bucket) and are public by default so
  they display correctly on the storefront.
