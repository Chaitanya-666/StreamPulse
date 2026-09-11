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

// good practices to follow with routes declaration
// if routes were defined here aswell then we would have used routes.get now need to use routes use btw need  to use middleware too for this
app.use("/api/v1/users", userRouter);
export { app };
