/**
 * Admin access is **not** controlled by constants in this file.
 *
 * The app uses the backend: sign in via `/login` with a user whose `role` is `ADMIN` in the database.
 * Default seeded admin (see `server/prisma/seed.ts`): email `admin@4rmtech.com`, password `admin12345`.
 *
 * This module is kept as a pointer for developers; nothing in the UI imports credentials from here.
 */

export {};
