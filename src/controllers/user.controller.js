import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //    console.log(
    //      `now verifying if these functions actually generated tokens still inside user controller ${accessToken} , and now refresh is ${refreshToken}`
    //    );
    // inject these back to user
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error(
      `Error occured when generating access and refresh token ${error}`
    );
    throw new apiError(500, "Something went wrong please try again later");
  }
};

// multer automatically makes sure this works with form data
const registerUser = asyncHandler(async (req, res) => {
  /*
   *  res.status(200).json({
    message: "ok",
    received: req.body,
  });

   * */
  // most likely the usual flow gonna be
  // post req to server -> server sees validates -> server sends  to db -> db further responses to server -> server says ok succesfully done -> server sends response back to client
  // typical standard stuff must be checked toJSON();
  // validation , alr exists etc
  // all required fields should be provided and should ideally be of correct formats
  // username , email , fullname first and last  names , avatar , password all are required rest can be sent or kept empty
  // create user object post to db , need to remove unnecessary stuff like userreferesh token , user password etc before  sending the body back to client
  // check user  creation , return res
  const {
    username,
    email,
    avatar,
    coverImage,
    password,
    fullName: { firstName, lastName } = {},
  } = req.body;
  // 2. Use your awesome .some() trick for the simple strings
  const hasEmptyStrings = [username, email, password].some(
    (field) => !field || field.trim() === ""
  );

  // 3. Check the required name fields individually (since middleName is optional)
  const hasEmptyNames =
    !firstName ||
    firstName.trim() === "" ||
    !lastName ||
    lastName.trim() === "";

  // 4. Throw if ANYTHING is missing or empty
  if (hasEmptyStrings || hasEmptyNames) {
    throw new apiError(400, "Please provide all required fields");
  } // now we can also check if User already  exists based on User model import
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  }).select("-password -refreshToken");
  if (existingUser) {
    throw new apiError(409, "User already exists , please login instead");
  }
  // multer gives access to files part now apart from typical body
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // notice the chain of ?.[0]?.
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file not found");
  }
  // since things were catched by server , now we try uploading to cloudinary
  //  console.log("inside user controller viewing req.files : ", req.files);
  const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
  console.log("Uplaoded Avatar Response", uploadedAvatar);
  let uploadedCoverImage = null;
  if (coverImageLocalPath) {
    uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("Uplaoded coverImage Response", uploadedCoverImage);
  }

  if (!uploadedAvatar) {
    throw new apiError(400, "Failed to upload avatar to cloud storage");
  }

  // create user object and now save on db once all operations before it are succesful
  const user = await User.create({
    username,
    email,
    avatar: uploadedAvatar?.url || "",
    coverImage: uploadedCoverImage?.url || "",
    password,
    fullName: { firstName, lastName },
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new apiError(500, "Failed while creating user");
  }
  return res
    .status(201)
    .json(
      new apiResponse(201, createdUser, "User was registered succesfully ")
    );
});

// now defining loginUser
// flow : if registered or user exists -> login or goto register user logic , during login -> check for accessTokenExists and hasnt  expired if not  login else -> refreshToken exists or not --> if yes generate and grab new access and continue -> if even this fails then there is a need for re authing by --> give options for login (decide ur fields) it can be password + {username , email} , etc now --> give tokens in form of secure cookies , properly reply to the client regarding login status
// some notes : use a identifier as first field , password as second , identifier can  query to valid username or email which is registered , add a 3rd remember me field

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    // throw errow saying either  username or password required
    throw new apiError(
      400,
      "Please provide either username or email to login "
    );
  } else {
    // provided atleast once , check if exists
    const user = await User.findOne({ $or: [{ username }, { email }] }).select(
      " -refreshToken"
    );
    if (!user) {
      throw new apiError(404, "User does not exist , Please register first ");
    }
    // verify password , note when using your personal defined methods  of the model then use singular smallcase user identifier
    const isPassCorrect = await user.isPasswordCorrect(password);
    if (!isPassCorrect) {
      throw new apiError(401, "Incorrect Password , try again ");
    }

    // even this passed then generate tokens
    const userId = user._id;
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(userId);
    //   console.log(`generator fired`);
    //   console.log(
    //     `now produced access as ${accessToken} and refresh ${refreshToken}`
    //   );
    // verify accessToken if its valid and proper while same should be done for refresh but again only  need to save refresh to db but actually refresh was stored in user object field only , the only thing here that is to handle now is regarding accessToken

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // define cookie optionn as refreshToken is gonna be sent in  that form
    const options = {
      httpOnly: true, // Prevents JavaScript (XSS) from reading the cookie
      sameSite: "strict", // Prevents CSRF attacks
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new apiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
            // ideally a bad practice , useful if u are building an app or something ?
          },
          "User logged in succesfully"
        )
      );
  }
});

// BELOW IS LOGIC EXECUTED ONLY WHEN AUTHJS MIDDLEWARE TAKES CARE OF VERIFYING IF WE HAVE LOGGEDIN THAT CONCERN IS SEPERATED TO THAT , BELOW IS JUST GOING TO BE HANDLING LOGOUT LOGIC
const logoutUser = asyncHandler(async (req, res) => {
  // main flow is , while silly first check if user is logged in if not then no user should hit this route or endpoint , later if loggedin logout would involve both clearing refresh and access token doing so simply requires  user to recomplete entire auth flow so it does achieve our logout functionality that is to allow user to next time properly login via their credentials , correction : more like just get rid of refreshToken not access cause access expires quickly anyway
  // is user logged in that logic will be checked and managed by middleware which we will soon write called as auth.js  which handles the responsibility of checking is user signed in
  await User.findByIdAndUpdate(
    req.user._id,
    // injected due to auth middleware
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
      // return new document after update rather than old one before update
    }
  );

  // begin clearing cookies with options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new apiResponse(200, {}, "Logged out succesfully"));
});

// now creating endpoint for re-getting access if we have refresh

const refreshAccessToken = asyncHandler(async (req, res) => {
  // the goal of this endpoint is to refresh an expired access token
  // most likely flow of this (since we are routed here only in case of stale accessToken no  need  to check that again ) -> grab existing refreshToken from user match and check if proper refreshToken -> now if didnt match let user auth from very begining , else hit the point or rather just get a newly generated access token tbh u can also call that big generateAccessAndRefreshToken but then again it doesntt make much sense to use that
  // correction : actually rotate and use the big function to get new both access and refresh tokens
  // due to cookie parser I can directly get from req
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    // if it doesnt exist need to reauth entirely
    throw new apiError(401, "Refresh Token Not Found , Please sign in again ");
  }
  // if exist verify and decode it
  const decodedRefreshToken = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  // after verification get user from it and then re generate access token for that user
  const user = await User.findById(decodedRefreshToken?._id).select(
    "-password"
  );
  // need to update this accessToken in cookies
  if (!user) {
    // invalid token user wasnt found
    throw new apiError(401, "Invalid Refresh Token , User was not found ");
  }
  // check if this refresh token indeed matches
  if (refreshToken !== user?.refreshToken) {
    throw new apiError(
      401,
      "Refresh Token mismatch ,Refresh token has been expired or used"
    );
  }
  // now if it  matches call the function to not only get access but also refresh token
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user._id);
  // please do not forget this await keyword

  const options = {
    httpOnly: true,
    secure: true,
  };

  // now the function call automatically handled setting back updated refresh token back to user , only thing matters is  cookies updation
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "Tokens were succesfully refreshed"
      )
    );
});

const changeCurrPassword = asyncHandler(async (req, res) => {
  // first of all verify properly the fact that user knows their current password or not
  // depending on future implementation if password has been forgotten another forgot controller should take over ?
  // enter current password verify it
  // ( security measure if forgot password fallback to registeration details to send otp and further proceed this though again is responsibility of seperate controller )
  // the next thing after verifying true authentication , proceed to password change by letting them enter and re confirm it
  // db update needed after this ,
  // depending on db state finally return success or not
  // also password change typically also means user is signed out of all / other non active accounts
  // consider  also getting new refresh and access tokens

  const { currPassword, newPassword, ConfirmNewPassword } = req.body;
  const user = req.user;
  // WHENEVER DOING DB OPERATIONS PLEASE REMEMBER THIS THAT IS USING AWAIT
  const userWithPassField = await User.findById(user._id).select("+password");
  const isPasswordCorrect =
    await userWithPassField.isPasswordCorrect(currPassword);
  if (!isPasswordCorrect) {
    throw new apiError(
      401,
      {},
      "Invalid credentials , Enter your correct current password first"
    );
    // alternatively consider mechanisms to give password reset link at registered email address and  such (FUTURE SCOPE)
  }
  // else proceed to change the password
  // check for also if new password in both fields match
  if (newPassword.trim() !== ConfirmNewPassword.trim()) {
    throw new apiError(400, {}, "Passwords do not match , try again");
    // check for literal match , dont use to lower case to  destroy entropy
  }
  // trigger pre save hook with only changed password
  userWithPassField.password = newPassword;
  await userWithPassField.save({ validateBeforeSave: false });
  // db saving needs time give it time
  // now also allow logout from all devices simply by refreshing access and refresh tokens , this will need other devices to auth again , they carry stale details
  // this causes change in access and refresh token field esp
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // atleast update the refresh token here directly
  const options = {
    httpOnly: true,
    secure: true,
  };

  // now the function call automatically handled setting back updated refresh token back to user , only thing matters is  cookies updation
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new apiResponse(200, {}, "Password succesfully changed"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // thinking of making it update only what provided , and confirm changes type of mechanism , rather than requiring strict , all fields needed for update , improves ux in my opinion , prevents user  to enter all details all over again just to say upload a profile  picture or their handle name etc , also thinking should i create modular functions for very specific jobs or let all stuff sit inside this massive updateAccountDetails
  // overall user details , what category they are and how we are going to deal with them
  // /update-account-details
  // classify fields and or collect fields and fire specific  functions only , very  highly specific modular functions
  //
  // username : text : update -> call updateUsername(str)
  // email : text : update -> call updateEmail(str) , for this consider also otp mechanism in future
  // fullName all 3 fields  : text -> one single updateFullName function only changing based on sent fields in request
  //
  // avatar and coverimage : fileuploads -> cloudinary logic involved and multer (already immplemmented ) : call highly specific  avatar and coverimage functions specifically
  // req thus should contain only fields which need updating

  // overall functions then defined into 2 categories , for each category design modular functions , modular functions when do their job in memory finally call user save that is commit only at last , return updated object , final response at the end
  // the functions ( concerned with memory in place updates probably sync not needed )
  // text based fields

  // req object is going to contain only concerned filled fields which are to be updated  and that function is thus invoked
  // the way i am thinking is doinng something like this
  // req.body.username.len()!=0 then use IIFE of updateUsername ( js basics are weak does iife support async ? ) but here helper modular functions will change in memory only

  // req.body  inside this ill send only concerned fields , technically since it is protected  route (AUTH middleware) i will have access to entire user object aswell

  // this route has to be muulter compataible so user.files
  let userObject = req.user; // auth has injected it
  let isUpdated = false;

  const updateUsername = (userObject, newUsername) => {
    userObject.username = newUsername;
  };
  const updateEmailaddress = (userObject, newEmailAddress) => {
    userObject.email = newEmailAddress;
  };
  const updateFirstName = (userObject, newFirstName) => {
    userObject.fullName.firstName = newFirstName;
  };
  const updateMiddleName = (userObject, newMiddleName) => {
    userObject.fullName.middleName = newMiddleName;
  };
  const updateLastName = (userObject, newLastName) => {
    userObject.fullName.lastName = newLastName;
  };

  // update file / image based
  const updateAvatar = async (userObject, avatarFilePath) => {
    // based on paths try to get url by util and update the necessary field with it

    const uploadedAvatar = await uploadOnCloudinary(avatarFilePath);
    userObject.avatar = uploadedAvatar.url;
  };
  const updateCoverImage = async (userObject, coverImageFilePath) => {
    const uploadedCoverImage = await uploadOnCloudinary(coverImageFilePath);
    userObject.coverImage = uploadedCoverImage.url;
  };

  if (req.body.newUsername) {
    updateUsername(userObject, req.body.newUsername);
    isUpdated = true;
  }
  if (req.body.newEmailAddress) {
    updateEmailaddress(userObject, req.body.newEmailAddress);
    isUpdated = true;
  }
  if (req.body.newFirstName) {
    updateFirstName(userObject, req.body.newFirstName);
    isUpdated = true;
  }
  if (req.body.newMiddleName) {
    updateMiddleName(userObject, req.body.newMiddleName);
    isUpdated = true;
  }
  if (req.body.newLastName) {
    updateLastName(userObject, req.body.newLastName);
    isUpdated = true;
  }
  const avatarFile = req.files?.avatar?.[0]?.path;
  const coverFile = req.files?.coverImage?.[0]?.path;
  if (avatarFile) {
    await updateAvatar(userObject, avatarFile);
    isUpdated = true;
  }
  if (coverFile) {
    await updateCoverImage(userObject, coverFile);
    isUpdated = true;
  }

  if (!isUpdated) {
    // update stuff
    //    user.save() --> forgot the syntax again
    //    further give succesful response and return this user object aswell
    throw new apiError(400, {}, "No updates were provided , nothing to do ");
  }
  await userObject.save({ validateModifiedOnly: true });
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        userObject,
        "Provided details were updated succesfully"
      )
    );
  // if atleast one change exist then proceed to commit into memory , this is actually directly
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // the goal is to display proper 'channel details' of a user meaning concerned information is about
  // subscriber list : people who have subscribed to users channel
  // SubscribedTo list : the channels this channel has subscribed to
  // basic information details are implicit
  // thus return all of above information
  // write a aggregation pipeline for this
  // an unprotected route btw , even non signed in can view this
  // future work can include something like instagram's private profile , where unless u are not only logged in but a active subscriber you cannot see their posts , even then user  must explicitly allow you to view their subscriptions , subscribers etc
  // implementation is as follows :
  const { username } = req.params;
  //  const user = await User.findOne({ username });
  if (!username) {
    throw new apiError(404, {}, "No user specified , nothing found");
    // effectively dead code , cant happen req param needs non empty string anyway
  }
  // if (!user) {
  //   throw new apiError(404, {}, "User not found . does this user exist ? ");
  // }
  // now that the user exist is confirmed then
  const foundUserChannel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // fetches subscribers who have subscribed to the user
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribedTo",
        as: "subscribers",
      },
    },
    {
      // below fetches the channels user has subscribed to
      $lookup: {
        from: "subscriptions",
        // target of join table
        localField: "_id",
        // of our own table ( primary key like)
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          // this boolean value check helps frontend display whether the user has subsrcibed to the given channel or not , kind of like how on youtube  the button turns grey once  i am subscribed to else it stays white saying subscribe
          // using a if conditional for this , if subscribers list has me as a subscriber then  it means i am subscribed to the channel
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        // TODO : to properly destructure and show only first and last name fields , also recommended u console log this whole returned thing to study what this aggregation result will return
        username: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
      // this is like select equivalent of sql
    },
  ]);

  if (!foundUserChannel?.length) {
    throw new apiError(
      404,
      {},
      "Channel not found , does this channel  exist ? "
    );
  }
  // now return either the array or just 1st elem as this pipeline will return an array of length 1
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        foundUserChannel[0],
        "Channel details fetched succesfully"
      )
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  // this has to fetch entire watch history of that user
  const user = await User.aggregate([
    {
      $match: {
        // the id here from req.user._id is string ? why was this used  here specifically then what about other id based matching ?
        _id: new mongoose.Types.ObjectId(req.user._id),
        // to be honest earlier internal matching was done , but now we are trying to use req.user._id and for that we need to ensure to properly get required id for matching here here from req uid we need to match and get required user properly
      },
    },
    {
      $lookup: {
        // this is joining , for the logic  of getting all videos from watch history to be displayed here , joining condition seems to be like this
        // inside watchHistory get video id and join on condition of this  uid matching video schemas video id , like that
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            // this is may be the concept of sub pipelines
            $lookup: {
              from: "users",
              localField: "owner",
              // owner as in sense of owning the videos , actually due to subpipeline i am guessing this is from video schemas localfield owner matching to user's user id this however is same as outer in a way ?
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    // still confused why use these pipelines  nestedly on inner level again and again
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    coverImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched succesfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrPassword,
  updateAccountDetails,
  getUserChannelProfile,
  getUserWatchHistory,
};
