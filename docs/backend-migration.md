# MongoDB backend

MongoDB Atlas is initialized with 37 collections and 32 indexes. Fresh account signup and login use MongoDB, bcrypt password hashes, and signed HTTP-only session cookies.

Configure these server-only values in `.env.local`:

- `MONGODB_URI`
- `MONGODB_DB`
- `AUTH_SECRET` (at least 32 random characters)

Legacy data, upload, payment and admin operations are temporarily unavailable until their MongoDB API endpoints are implemented. Do not connect to the database from browser code.
