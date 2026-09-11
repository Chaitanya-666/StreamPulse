// require("dotenv").config({ path: "./env" });
// actually now in node 20.6+ theres no need of dotenv at all u can natively pass env file as node --env-file .env index.js
import { app } from "./app.js";
import connectDB from "./db/index.js";
// always remember 2 things , our  database isolated like on another continent we need to take care of distribution related problem , dont directly connect oneliner always use trycatch or async await etc to properly wrap everything in promises , as we may not be guranteed a succesful connnection with db on first try it may take some time
// the logic of db connection and such thus now belongs to index.js inside the db folder
/*
 * the other syntax for this would begin ?
 * import dotenv from "dotenv"
 * then later  u would use  dotenv.config({path: "./env"})
 * */
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error occured : ", error);
      throw error;
    });
    app.listen(process.env.PORT || 8000);
    console.log("Server listening at : ", process.env.PORT);
  })
  .catch((err) => {
    console.log("MONGODB connection failed", err);
  });

/*
 * basically this thing works too but theres an even better approach 
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

    app.on("error", (error) => {
      console.log("ERROR", error);
    });

    app.listen(process.env.PORT, () => {
      console.log(`Listening on port : ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR WHICH OCCURED WHILE CONNECTING TO DB IS : ", error);
  }
})();
*/
