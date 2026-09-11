import mongoose, { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const UserSchema = new Schema(
  {
    // since mongoose or rather mongodb provides _id we dont need to define this field at all
    //    id: {
    //      type: String,
    //      required: true,
    //      unique: true,
    //      // although it seems mongoose has its own internal _id thing acting as primary  key ?
    //    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      minlength: 6,
      maxlength: 20,
      trim: true,
      // ideally shouldnt use index true as mongoose object id will take care of  it ?
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    fullName: {
      firstName: {
        type: String,
        required: true,
      },
      middleName: {
        type: String,
      },
      lastName: {
        type: String,
        required: true,
      },
    },
    avatar: {
      type: String,
      // will use cloudinary url or smh else entirely
    },
    coverImage: { type: String },
    password: {
      type: String,
      required: true,
      // expectation is that this is the hashed password and our hash function is strong enough to provide uniquenesss hence not using unique:true here again , to ensure hashing use mongoose pre save hook
    },
    refreshToken: {
      // these are being  used as or rather stored as HttponlyCookie , has long time to live , js cant  steal it , gets us unlimited access tokens
      type: String,
    },
    watchHistory: {
      // this is gonna be array of objects of videos hence we are going to later create and give video ref objectid here of video model
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
          // i believe this is slightly syntactically wrong
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// pre save hook runs only when password changes
// can use argon2id aswell rather than bcrypt
UserSchema.pre("save", async function () {
  // arrow functions cannot bind  this
  if (!this.isModified("password")) return; // if isnt changed goto next appropriate  handler else encrypt and  save again , old hash overwrriten i guess ?
  this.password = bcrypt.hash(this.password, 10);
  // removed await keyword from here
});
// also need a middleware for password verification , writing our own custom hook

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
  // we need to pass normal plaintext string pass , and  the pass hashed by and saved in this User model ?
};

// can inject as many methods as we want into this user schema

UserSchema.methods.generateAccessToken = function () {
  // console.log("trying to sign in user model access token");
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName.firstName + " " + this.fullName.lastName,
      // can use as many fields needed in the payload
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
UserSchema.methods.generateRefreshToken = function () {
  // refresh token has negligible payload , it has to refresh frequently ideally it just has id
  // console.log("trying to sign in user model refresh token");
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = model("User", UserSchema);
