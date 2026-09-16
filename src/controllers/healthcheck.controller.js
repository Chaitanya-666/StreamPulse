import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Check server health and status
 * @route GET /api/v1/healthcheck
 * @access Public
 */
const healthcheck = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new apiResponse(
      200,
      {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        status: "OK",
      },
      "Healthcheck passed successfully"
    )
  );
});

export { healthcheck };
