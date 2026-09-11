# Antigravity Context

## Project Overview
- **Project Name:** youtube-backend (TechTree/backend/projectX)
- **Tech Stack:** Node.js, Express, MongoDB (Mongoose), Cloudinary (for file uploads)

## Current State
- The backend has a fully implemented `user` router (`src/routes/user.route.js`) and corresponding controller (`src/controllers/user.controller.js`).
- **Features Implemented:**
  - User Registration (with `avatar` and `coverImage` upload via Multer to Cloudinary).
  - User Login (generates access and refresh tokens).
  - JWT Authentication (`verifyJWT` middleware) protecting sensitive routes.
  - User Logout (clears tokens).
  - Token Refresh.
  - Password Change.
  - Account Details Update (with optional image updates).
  - User Channel Profile (uses MongoDB aggregation pipelines to get subscriber counts and subscription status).
  - User Watch History (uses MongoDB aggregation pipelines).

## Recent Tasks Completed
- Scanned the `routes/` and `controllers/` directories.
- Generated a Postman Collection v2.1 file (`projectX-backend.postman_collection.json`) grouping all user endpoints.
- Generated a Postman Environment file (`postman_environment.json`) containing the `baseUrl` (`http://localhost:8000/api/v1`).
- Accurately mapped JSON body payloads, form-data payloads for file uploads, and added authentication notes for routes protected by `verifyJWT`.

## Notes for Future Reference
- The project uses ECMAScript modules (`"type": "module"` in `package.json`).
- `baseUrl` is mounted in `app.js` at `/api/v1`. The `user` router is mounted at `/api/v1/users`.
