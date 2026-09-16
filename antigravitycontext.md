# Antigravity Context — StreamPulse Backend

## Project Overview
- **Project Name:** StreamPulse (Social Media & Video Streaming Platform Backend)
- **Author:** Chaitanya Shinde (VJTI CE '27)
- **Tech Stack:** Node.js (ES Modules), Express.js 5, MongoDB (Mongoose with `mongoose-aggregate-paginate-v2`), Cloudinary, Multer, JWT, Bcrypt

## Current State & Modules Implemented
1. **Healthcheck** (`/api/v1/healthcheck`)
   - Route and controller returning system uptime, timestamp, and health status.
2. **User Module** (`/api/v1/users`)
   - Registration, Login, Logout, Refresh Token Rotation, Password Change, Account Details Update, Channel Profile, and Watch History.
3. **Video Module** (`/api/v1/videos`)
   - Multipart video & thumbnail upload to Cloudinary with duration extraction.
   - Atomic view increment (`$inc`), get by ID, metadata update with thumbnail replacement and old asset deletion.
   - Publish status toggle.
   - `getAllVideos` with regex query search, user filtering, owner projection, sorting, and aggregation pagination.
4. **Comment Module** (`/api/v1/comments`)
   - CRUD comments on videos.
   - `getVideoComments` pipeline joining comment authors, computing `likesCount`, and conditional `isLiked` status with pagination.
5. **Like Module** (`/api/v1/likes`)
   - Atomic toggles for Video, Comment, and Post likes.
   - `getLikedVideos` pipeline with nested video and creator lookups.
   - Compound sparse unique indexes preventing race condition duplicates.
6. **Subscription Module** (`/api/v1/subscriptions`)
   - Toggle subscription with self-subscription guard.
   - `getUserChannelSubscribers` with mutual subscription check via correlated sub-lookup (`let` + `$expr`), and `getSubscribedChannels` with latest uploaded video preview.
   - Compound unique index on `{ subscriber: 1, subscribedTo: 1 }`.
7. **Playlist Module** (`/api/v1/playlists`)
   - CRUD playlists with atomic `$addToSet` (prevent duplicate videos) and `$pull` (remove videos).
   - Aggregated playlist view computing `totalVideos` and `totalViews`.
8. **Post Module** (`/api/v1/posts`)
   - Community posts CRUD with aggregated like metrics and `isLiked` viewer status.
9. **Dashboard Module** (`/api/v1/dashboard`)
   - Creator studio view (`/dashboard/videos`).
   - `getChannelStats` using MongoDB `$facet` to compute total videos, total views, total subscribers, and total video likes in a single DB round-trip.

## Architecture & System Design Documentation
- **Architecture & System Design Guide:** Located at `docs/ARCHITECTURE_AND_DESIGN.md`. Covers modular MVC, security, aggregation pipelines, Multer/Cloudinary streaming, and technical decisions.
- **Pipeline Utilities:** Located at `src/pipelines/aggregatePipelines.js`. Modular aggregation builders for all relational queries and metric rollups.
- **Postman Collections:**
  - `StreamPulse.postman_collection.json`
  - `projectX-backend.postman_collection.json`
  - `postman_environment.json`
