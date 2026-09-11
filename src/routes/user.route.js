// handle all user related routes in here
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  changeCurrPassword,
  loginUser,
  getUserChannelProfile,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  getUserWatchHistory,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
// register the user with all necessary details

// now handling login route
router.route("/login").post(loginUser);

// secured routes : concept , these routes are only accessed provided ur auth was successful

router.route("/logout").post(verifyJWT, logoutUser);
// routing it here really shouldnt make sense per se but still its here
// router.route("/refresh-token").post(refreshAccessToken);
// add more routes like changepassword , updateaccountdetails , etc

// New routes which were added
router.route("/change-password").post(verifyJWT, changeCurrPassword);
router.route("/current-user").post(verifyJWT, getUserChannelProfile);
router.route("/update-accountDetails").patch(
  verifyJWT,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
    // upload.single could that have been used when uplaod avatar and upload coverimage these were independent ?
  ]),
  updateAccountDetails
);
// use patch for updating existing resource , hence route is bounded by that method type , and also in here while doing those update this one route should also handle files when handling avatar and  coverimage updates hence use upload middleware too

// now when handling the route which has parameter (param) based query then do following
router.route("/ch/:username").get(getUserChannelProfile);
// even  unsigned can view channel profile details before logging in
// for history they will be only allowed to view their own watch history
router.route("/history").get(verifyJWT, getUserWatchHistory);

export default router;
