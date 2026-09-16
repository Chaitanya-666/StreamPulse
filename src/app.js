import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
); // simple using cors() mostly is sufficient on itself we can also pass additional options into it , use basically mounts the middleware sitting between the req and our routes

// url encoded ==> data passing through url itself

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// for static files
app.use(express.static("public"));

app.use(cookieParser());

// middlewares gonn use  typical req res but also err -> error reporting , next -> passes and chains middleware

// builtin middleware parsing incoming jsonrequest bodies rawjson --> javascript object attaching to req.body
/*
 *The limit: "16kb" Option
This is a security measure. It caps the maximum size of the JSON body Express will accept:
Table
Scenario	What happens
Body ≤ 16KB	Parsed normally, req.body populated
Body > 16KB	Request rejected with 413 Payload Too Large
Why limit it? Prevent attackers from sending massive JSON payloads to crash your server or exhaust memory. 16KB is plenty for most API requests (a typical JSON object is a few hundred bytes).
 * */
app.use(
  express.json({
    limit: "16kb",
  })
);

// import routes here
import userRouter from "./routes/user.route.js";
import videoRouter from "./routes/video.route.js";
import commentRouter from "./routes/comment.route.js";
import likeRouter from "./routes/like.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import playlistRouter from "./routes/playlist.route.js";
import postRouter from "./routes/post.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import healthcheckRouter from "./routes/healthcheck.route.js";

// Routes declarations
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Global Error Handler Middleware
// Ensures all thrown apiErrors or uncaught exceptions return structured JSON
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

export { app };
