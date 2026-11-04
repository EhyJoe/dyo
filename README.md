# DYO Youth website

This frontend uses Next.js App Router with React and TypeScript.

## Run locally

1. Copy `.env.example` to `.env.local` and set the MongoDB connection, database name, and `AUTH_SECRET`.
   To enable password reset, welcome, and programme registration emails, also set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from your Resend account. Set `NEXT_PUBLIC_SITE_URL` to the public website origin so email links point to the deployed site (it defaults to localhost for development).
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Build for production with `npm run build` and serve with `npm start`.

## Seeding an admin account

The temporary local admin bypass has been removed. Before deploying, create a
real super-admin account in MongoDB (passwords are bcrypt-hashed, cost factor 12):

```
npx tsx scripts/seed-admin.ts --email admin@dyoyouth.org --password "a strong password"
```

After this runs you can log in through the normal login page. The script is
safe to re-run: it refuses to overwrite an existing account.

The admin sidebar now focuses on public website editors: programmes, store
items, flyers and updates, the home slideshow, gallery, blog, leadership,
custom pages, and tournaments. Media uploads are stored in MongoDB GridFS.

The interactive legacy React components run as client components inside the App Router. Routes are defined under `app/`; the admin shell is shared by `app/admin/layout.tsx`.
