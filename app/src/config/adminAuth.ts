/**
 * Admin access is **not** controlled by constants in this file.
 *
 * Sign in normally using Firebase Auth (`/login`), then the backend resolves admin role
 * from `users/{uid}.role` and/or `ADMIN_EMAILS` in server environment variables.
 *
 * This module is kept as a pointer for developers; nothing in the UI imports credentials from here.
 */

export {};
