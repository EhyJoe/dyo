# DYO Youth website

This frontend uses Next.js App Router with React and TypeScript.

## Run locally

1. Copy `.env.example` to `.env.local` and set the MongoDB connection, database name, and `AUTH_SECRET`.
   To enable password reset, welcome, and programme registration emails, also set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from your Resend account. Set `NEXT_PUBLIC_SITE_URL` to the public website origin so email links point to the deployed site (it defaults to localhost for development).
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Build for production with `npm run build` and serve with `npm start`.

## Temporary local admin

For local development only, the admin login accepts `admin@localhost.test` / `admin123`.
This temporary super-admin bypass is disabled in production. Remove it from
`app/api/auth/login/route.ts` and `app/api/auth/session/route.ts` after creating
a real admin account in MongoDB. Admin data screens still require the MongoDB
connection and `AUTH_SECRET` in `.env.local`.

The admin sidebar now focuses on public website editors: programmes, store
items, flyers and updates, the home slideshow, gallery, blog, leadership,
custom pages, and tournaments. Media uploads are stored in MongoDB GridFS.

The interactive legacy React components run as client components inside the App Router. Routes are defined under `app/`; the admin shell is shared by `app/admin/layout.tsx`.
