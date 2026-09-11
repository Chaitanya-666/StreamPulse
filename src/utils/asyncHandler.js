/*const asyncHandler = (fn) => async (req, res, next) => {
  try{
    await fn(req,res,next)
  }
  catch(error){
    res.status(err.code || 500).json({
      success : false,
      message : err.message,
    })
  }
};
above is method 1 try catch method for dealing with this theres another one involving promises which helps deal better
*/
// promises method below which does same thing as above
/*
 *
Small correction: Promises are the older pattern. Async/await is the syntactic sugar over promises. So actually:
Promises came first (.then(), .catch())
Async/await is the newer "sugar" that makes promises read like synchronous code
But your core point is right: you're replacing explicit try-catch with promise chaining to achieve the same protection.
 * */
const asyncHandler = (reqHandler) => {
  return (req, res, next) => {
    // instead of defining try catch here we are going to use promises to wrap up in same syntactic sugar as async await
    Promise.resolve(reqHandler(req, res, next)).catch((err) => {
      console.log(err);
      next(err); // skips straight to error handling part
    });
  };
};
export { asyncHandler };
