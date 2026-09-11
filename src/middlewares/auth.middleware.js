import jwt from "jsonwebtoken";
// nodejs 20.6.0 >= native .env support exist
import { apiError } from "../utils/apiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const accessToken =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  //  const refreshToken = req.cookies.refreshToken;
  //  ignoring refresh here let refresh be used only when access fails ? more like we will be able to get refresh if it doesnt exist and if refresh exist then simply get new access token
  if (!accessToken) {
    // should probably also need to re direct / route it to get new accessToken
    throw new apiError(401, {}, "Unauthorized request , Please login first ");
  }
  // if exists then it means verify their signature
  const decodedAccessToken = jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET
  );

  const user = await User.findById(decodedAccessToken?._id).select(
    "-password -refreshToken"
  );

  // now it means the req had access token and it also was able to pass the  signature verification , now from that signature verification decode the token we ideally get proper uid  corresponding to that uid collect that user but if it was invalid token obviously uid will be garbage and user wont exist in that case we can easily say accesstoken has been expired either that or it was invalid to begin with ?
  if (!user) {
    // frontend should handle the logic to automatically route to get new access token provided refresh exist ?
    throw new apiError(401, {}, "Invalid Access Token ");
  }

  req.user = user;

  next();
});
