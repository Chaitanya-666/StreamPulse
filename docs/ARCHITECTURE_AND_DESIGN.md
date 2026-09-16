# StreamPulse — Backend Architecture & System Design Documentation
**Domain:** Social Video & Media Streaming Platform Backend Architecture  
**Tech Stack:** Node.js (ES Modules), Express.js 5, MongoDB & Mongoose, Cloudinary, Multer, JWT, Bcrypt

---

## Table of Contents
1. [System Architecture & Design Patterns](#1-system-architecture--design-patterns)
2. [Authentication, Security & Token Lifecycle](#2-authentication-security--token-lifecycle)
3. [Multipart Media & Storage Pipeline](#3-multipart-media--storage-pipeline)
4. [MongoDB Schema Design & Indexing Strategy](#4-mongodb-schema-design--indexing-strategy)
5. [Core Aggregation Pipelines](#5-core-aggregation-pipelines)
6. [Pagination Under The Hood: Offset vs Keyset/Cursor](#6-pagination-under-the-hood-offset-vs-keysetcursor)
7. [System Design Deep-Dive & Architecture Decisions](#7-system-design-deep-dive--architecture-decisions)

---

## 1. System Architecture & Design Patterns

### 1.1 Modular MVC Architecture
The codebase strictly adheres to the Model-View-Controller (MVC) separation of concerns (with Views delegated to client applications):
- **Routes (`src/routes/`)**: Pure routing layer. Maps HTTP verbs and endpoints, chains middleware (`verifyJWT`, `upload`), and delegates request handling to controllers.
- **Controllers (`src/controllers/`)**: Encapsulates business logic, input validation, aggregation orchestration, and response dispatching.
- **Models (`src/models/`)**: Mongoose schemas defining data types, validation rules, compound indexes, pre/post hooks, and schema plugins.
- **Pipelines (`src/pipelines/`)**: High-performance MongoDB aggregation builders for complex queries and multi-collection analytics.
- **Utilities (`src/utils/`)**: Standardized reusable blueprints (`apiResponse`, `apiError`, `asyncHandler`, `cloudinary`).
- **Middlewares (`src/middlewares/`)**: Interceptors for cross-cutting concerns (token verification, multipart file extraction, global error capturing).

### 1.2 The `asyncHandler` Higher-Order Wrapper
In Express 4/5, uncaught rejections inside asynchronous route handlers do not automatically reach the default error handler without explicit error propagation. 

Instead of wrapping every single controller method in an identical, verbose `try-catch` block:
```javascript
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
```
#### Technical Rationale:
- **How it works:** It takes a function `requestHandler` as an argument and returns a standard Express middleware `(req, res, next)`.
- **Promise.resolve():** Guarantees that whether the handler is `async` or returns a standard Promise, any unhandled rejection is caught in `.catch()` and routed to Express's `next(err)`.
- **Clean Call Stack:** It avoids repeating 10 lines of boilerplate in every endpoint and preserves clean separation between happy-path logic and error reporting.

### 1.3 Centralized Error Formatting (`apiError` & Global Error Middleware)
- Native JavaScript `Error` objects only carry a `message` and `stack`.
- In StreamPulse, `apiError` extends `Error`, attaching `statusCode`, `errors` array, `data = null`, and `success = false`.
- In `src/app.js`, a centralized 4-parameter error middleware intercepts all exceptions:
```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.error || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});
```
*Guarantees:* Eliminates HTML error leaks or unformatted crashes. Client applications always receive predictable, machine-readable JSON.

---

## 2. Authentication, Security & Token Lifecycle

### 2.1 Dual Token Pattern (Access Token + Refresh Token)
StreamPulse implements the industry-standard dual-token authentication pattern:

| Characteristic | Access Token (JWT) | Refresh Token (JWT) |
| :--- | :--- | :--- |
| **Lifespan** | Short (15 min – 1 hour) | Long (7 – 30 days) |
| **Payload** | `_id`, `email`, `username`, `fullName` | `_id` only |
| **Storage (Client)** | HTTP-Only Cookie or In-Memory | HTTP-Only, Secure Cookie |
| **Storage (Server)** | Stateless (not in DB) | Stored in User document (`refreshToken`) |
| **Purpose** | Authorizes protected API requests | Rotates new Access Tokens |

### 2.2 Why Store the Refresh Token in MongoDB?
If JWTs are self-contained and verifiable via cryptographic signatures (`jwt.verify`), why store the refresh token in the database?
1. **Revocation & Instant Invalidation:** A pure stateless JWT cannot be revoked before its expiration timestamp. Storing the refresh token in the DB allows instant session invalidation upon user logout or password change (`User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } })`).
2. **Refresh Token Rotation (RTR):** Every time the client requests a new access token using `/refresh-token`, the old refresh token is invalidated and a brand-new refresh token is generated and persisted.
3. **Replay Attack Detection:** If a compromised refresh token is submitted after it has already been rotated, the server flags the session as compromised, revokes all tokens for that user, and forces a re-login.

### 2.3 Cookie Security Attributes
Both tokens are transmitted via HTTP cookies configured with:
- `httpOnly: true`: Prevents client-side JavaScript (`document.cookie`) from accessing the token. Completely neutralizes **Cross-Site Scripting (XSS)** token theft.
- `secure: true`: Ensures cookies are only sent over encrypted HTTPS connections (disabled in local dev, enforced in production).
- `sameSite: "strict"` or `"lax"`: Mitigates **Cross-Site Request Forgery (CSRF)** by forbidding browsers from attaching cookies to cross-site requests.

---

## 3. Multipart Media & Storage Pipeline

### 3.1 Why `diskStorage` vs `memoryStorage` in Multer?
When handling video uploads (which can range from 50MB to 500MB+):
- **`memoryStorage` danger:** Node.js buffers the entire file into V8 RAM as a Buffer. The V8 heap default is ~1.4GB - 4GB. If multiple users simultaneously upload large videos, `memoryStorage` causes Node.js process Out-Of-Memory (OOM) crashes.
- **`diskStorage` solution:** Streams incoming file chunks directly to local disk (`public/tmp/`). RAM consumption remains bounded in kilobytes regardless of file size.

### 3.2 Bulletproof Staging Cleanup (`try ... finally { fs.unlinkSync() }`)
In `src/utils/cloudinary.js`:
```javascript
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) return null;
    const res = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
    return res;
  } catch (error) {
    throw new apiError(500, {}, "Error occurred while uploading file");
  } finally {
    // ALWAYS unlinks temp file, regardless of whether upload succeeded or crashed
    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch (e) { console.error(e); }
    }
  }
};
```
*System Reliability:* The `finally` block guarantees no disk exhaustion (server full) condition occurs over time, even during network timeouts or storage provider 5xx errors.

### 3.3 Automatic Video Duration Extraction
Cloudinary inspects the video container metadata during transcoding and returns `{ duration: 124.52 }` (in seconds). StreamPulse captures this directly in the `publishAVideo` controller, eliminating the need to run local `ffprobe` or `ffmpeg` child processes on the Node server.

---

## 4. MongoDB Schema Design & Indexing Strategy

### 4.1 Embedding vs Referencing (16MB Document Limit)
- **Why NOT embed comments inside the Video document?**
  MongoDB has a hard **16MB BSON document limit**. A viral video with 100,000 comments would blow past 16MB and crash writes.
  Furthermore, pagination (`$slice`) on large embedded arrays in MongoDB incurs high CPU overhead.
  *Design Choice:* Separate `Comment` collection referenced by `video: ObjectId`.

- **Why NOT embed likes inside the Video document?**
  High write contention. If thousands of users click "Like" within the same window, concurrent `$push` operations on a single document create write locks and latency spikes.
  *Design Choice:* Dedicated `Like` collection with atomic indexing.

### 4.2 Compound & Sparse Indexes
```javascript
// 1. Subscription Model:
subscriptionSchema.index({ subscriber: 1, subscribedTo: 1 }, { unique: true });

// 2. Like Model (Sparse Unique):
likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ post: 1, likedBy: 1 }, { unique: true, sparse: true });

// 3. Comment Model:
commentSchema.index({ video: 1, createdAt: -1 });
```
#### Technical Rationale:
- **Race Condition Prevention:** An application-level check (`if (await Like.findOne(...))`) suffers from Time-Of-Check to Time-Of-Use (TOCTOU) race conditions. Two simultaneous clicks can pass the check and insert duplicates. A database-level compound unique index guarantees atomicity.
- **Why `sparse: true` on Likes?** Because the `Like` schema has optional target fields (`video`, `comment`, `post`). Without `sparse: true`, Mongo would index documents where `video: null`, causing duplicate key collisions for comment/post likes.

---

## 5. Core Aggregation Pipelines

### Pipeline 1: `getAllVideos` (Dynamic Filtering, Join & Pagination)
```javascript
[
  {
    $match: {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ],
      isPublished: true
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
    }
  },
  { $unwind: "$owner" },
  { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } }
]
```
*Highlights:*
- `$match` precedes `$lookup` to filter out irrelevant rows before executing expensive cross-collection joins.
- Sub-pipeline in `$lookup` projects only safe public user fields, preventing sensitive password hashes from entering the aggregation memory buffer.

---

### Pipeline 2: `getVideoComments` (Nested Counts & Conditional Logic)
```javascript
[
  { $match: { video: new mongoose.Types.ObjectId(videoId) } },
  {
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
    }
  },
  { $unwind: "$owner" },
  {
    $lookup: {
      from: "likes",
      localField: "_id",
      foreignField: "comment",
      as: "likes"
    }
  },
  {
    $addFields: {
      likesCount: { $size: "$likes" },
      isLiked: {
        $cond: {
          if: { $in: [requestingUserId, "$likes.likedBy"] },
          then: true,
          else: false
        }
      }
    }
  },
  { $project: { likes: 0 } },
  { $sort: { createdAt: -1 } }
]
```
*Highlights:*
- Uses `$cond` and `$in` inside `$addFields` to compute a contextual boolean (`isLiked`) specific to the current viewer in a single database pass.
- `{ $project: { likes: 0 } }` discards the joined likes array immediately after computing counts to save network payload size and client memory.

---

### Pipeline 3: `getLikedVideos` (Two-Tier Correlated Joins)
```javascript
[
  { $match: { likedBy: userObjId, video: { $exists: true, $ne: null } } },
  {
    $lookup: {
      from: "videos",
      localField: "video",
      foreignField: "_id",
      as: "video",
      pipeline: [
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
          }
        },
        { $unwind: "$owner" }
      ]
    }
  },
  { $unwind: "$video" },
  { $match: { "video.isPublished": true } },
  { $sort: { createdAt: -1 } }
]
```
*Highlights:* Demonstrates two-tier nesting (`Like -> Video -> Video Owner`) within a single declarative pipeline, preserving consistency on read.

---

### Pipeline 4: `getUserChannelSubscribers` (Graph Relationship & Mutual Subscriptions)
```javascript
[
  { $match: { subscribedTo: channelObjId } },
  {
    $lookup: {
      from: "users",
      localField: "subscriber",
      foreignField: "_id",
      as: "subscriber",
      pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
    }
  },
  { $unwind: "$subscriber" },
  // Correlated Subquery to check if current logged-in user also subscribes to this subscriber
  {
    $lookup: {
      from: "subscriptions",
      let: { subscriberId: "$subscriber._id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$subscriber", loggedInUserId] },
                { $eq: ["$subscribedTo", "$$subscriberId"] }
              ]
            }
          }
        }
      ],
      as: "mutualSub"
    }
  },
  {
    $addFields: {
      "subscriber.isSubscribed": {
        $cond: {
          if: { $gt: [{ $size: "$mutualSub" }, 0] },
          then: true,
          else: false
        }
      }
    }
  }
]
```
*Highlights:* Uses `let` and `$expr` to perform a correlated sub-lookup. This resolves "Mutual Subscription" status without making N+1 database roundtrips.

---

### Pipeline 5: `getChannelStats` (Parallel Analytics with `$facet`)
```javascript
Video.aggregate([
  { $match: { owner: channelObjId } },
  {
    $facet: {
      videoStats: [
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: "$views" }
          }
        }
      ],
      likesStats: [
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "video",
            as: "likes"
          }
        },
        { $unwind: "$likes" },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: 1 }
          }
        }
      ]
    }
  }
])
```
*Highlights:*
- **`$facet` Mechanism:** Processes multiple aggregation sub-pipelines within a single stage on the same set of input documents.
- **Latency Advantage:** Instead of running separate roundtrips across the network (`countDocuments`, `aggregate views`, `lookup likes`), `$facet` executes them concurrently in the database engine, returning all metrics in a single round-trip.

---

## 6. Pagination Under The Hood: Offset vs Keyset/Cursor

### How `mongoose-aggregate-paginate-v2` Operates
`aggregatePaginate` intercepts the aggregation pipeline and runs two parallel operations:
1. A **Count Pipeline** (replaces projecting stages with `{ $count: "total" }`) to compute `totalDocs`, `totalPages`, `hasNextPage`.
2. A **Data Pipeline** (appends `{ $skip: (page - 1) * limit }` and `{ $limit: limit }`).

### Offset Pagination (`$skip` / `$limit`) vs Keyset / Cursor Pagination
| Feature | Offset Pagination (`$skip`) | Cursor-based Pagination |
| :--- | :--- | :--- |
| **How it queries** | `skip(10000).limit(10)` | `find({ _id: { $lt: lastSeenId } }).limit(10)` |
| **Time Complexity** | $O(N)$ (Must scan and discard $N$ documents) | $O(1)$ (B-Tree index seek directly to key) |
| **Large Offsets** | Higher latency on deep pages | Constant time at any depth |
| **Use Case in StreamPulse** | Search tables, dashboard views with direct page jumps | Continuous video feeds |

---

## 7. System Design Deep-Dive & Architecture Decisions

### Q1: Concurrency Control on Toggle Actions
If two requests trigger a toggle simultaneously, relying solely on `findOne()` causes duplicate records. A **compound unique index** on `{ subscriber: 1, subscribedTo: 1 }` ensures one write succeeds while the second fails with error code `11000 (DuplicateKeyError)`, guaranteeing idempotency under high concurrency.

### Q2: Why Aggregations over Application-Level Population?
Mongoose `.populate()` runs multiple queries on the application layer, fetching full documents into memory before merging. In contrast, aggregation pipelines (`$lookup`, `$match`, `$project`) execute natively in MongoDB's C++ core engine. Only filtered, formatted, and pruned datasets cross the network to Node.js.

### Q3: Lifespan Segregation: Access vs Refresh Token
Access tokens travel in headers/cookies on every request. A short lifespan (15 minutes) limits exposure in case of network interception. The Refresh Token travels only during token renewal to `/refresh-token`. Storing it in the database enables instant session revocation.

### Q4: Refresh Token Rotation (RTR) Mechanism
Every token refresh invalidates the current refresh token and issues a new pair. If a revoked token is presented again, the system recognizes a replay attempt, invalidates all sessions for that user, and prompts for re-authentication.

### Q5: Fault-Tolerant Staging Cleanup
Multer disk uploads must be cleaned up regardless of whether subsequent cloud upload succeeds or fails. Wrapping unlinking inside a `finally` block ensures orphan files do not accumulate on disk during timeouts or external network failures.

### Q6: Memory Constraints in Pipeline Execution
MongoDB enforces a 100MB RAM limit per aggregation stage. For massive collections, `{ allowDiskUse: true }` enables the engine to spill temporary data to disk during processing.

### Q7: Simple vs Correlated `$lookup`
Simple `$lookup` performs standard equality joins on two fields. Correlated `$lookup` uses `let` to bind variables and an inner `pipeline` with `$expr`, enabling complex joins involving expressions, multiple boolean checks, and sub-queries.

### Q8: REST Verb Consistency (`PUT` vs `PATCH`)
`PUT` replaces an entire resource with the payload. `PATCH` applies partial updates. All entity updates in StreamPulse use `PATCH` to allow granular updates (e.g., thumbnail only, title only).

### Q9: Cookie Security against Script Ingestion
`httpOnly` cookies cannot be accessed by any client-side JavaScript API, mitigating credential theft via Cross-Site Scripting (XSS).

### Q10: Search Query Optimization
Unanchored `$regex` queries require full collection scans. Production scaling can utilize MongoDB Text Indexes (`{ title: "text", description: "text" }`) with `$text: { $search: query }` for index-backed searches.

### Q11: Payload Pruning
Using `$project` in aggregation pipelines ensures only necessary fields are serialized and transmitted, minimizing payload size, memory usage, and serialization latency.

### Q12: Token Validation & Database State Sync
Cryptographic verification (`jwt.verify`) validates signature and expiry but cannot detect account bans or password resets performed after token generation. Querying the database guarantees current user validity.

### Q13: The ESR Indexing Principle
Index compound fields in order: **Equality** (`$eq`), **Sort** (`$sort`), and **Range** (`$gt`, `$in`). This allows MongoDB to resolve both filtering and sorting directly from index bounds.

### Q14: Scalability at 100K+ Concurrent Streams
- **Delivery:** Offload video delivery to CDNs (e.g., CloudFront, Cloudflare) with adaptive bitrate streaming (HLS/DASH). The Node.js application server serves only API metadata.
- **Database:** Deploy replica sets with read preference `secondaryPreferred` for read-heavy routes.
- **Caching:** Cache hot metadata (video details, view counts, user profiles) in Redis with cache-aside policies.
- **Horizontal Scaling:** Deploy stateless Node.js containers behind a load balancer.

### Q15: Asynchronous I/O Handling in Node.js
While V8 runs on a single event loop thread, all asynchronous I/O (database network requests, file system writes, cloud storage uploads) is handled by **libuv** worker threads and OS-level non-blocking primitives (`epoll`/`kqueue`). Completed operations resolve via the microtask queue, enabling high concurrent throughput with minimal memory overhead.
