# DYO Youth website

This frontend uses Next.js App Router with React and TypeScript.

## Run locally

1. Copy `.env.example` to `.env.local` and set the MongoDB connection, database name, and `AUTH_SECRET`.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Build for production with `npm run build` and serve with `npm start`.

The interactive legacy React components run as client components inside the App Router. Routes are defined under `app/`; the admin shell is shared by `app/admin/layout.tsx`.
