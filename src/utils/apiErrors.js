// yet another util standardizing error reporting so far i have unnderstood that utils are a way to get blueprints for repetitive tasks and also standardizing them
class apiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    error = [],
    stack = ""
  ) {
    super(message);
    // calls constructor of parent class essentially all this because constructor called in order of derivation destructors the other way
    // here super is  needed for subclass else this wont work and we get ref error because it sets this.name = error , this.message = passed message and further context is obtained further ??
    this.statusCode = statusCode;
    this.data = null;
    // the above field is set null for consistency as during the error we have to follow normal api response blueprint but in this  case we have nothing to return for error hence  send null data
    this.message = message;
    this.success = false; // custom field added this isnt any inherited field
    this.error = error;
    // stack trace is needed for pinpointing what files produce error
    if (stack) {
      this.stack = stack;
    } else {
      // explain this in good depth if necessary
      Error.captureStackTrace(this, this.constructor);
      /*
       *The second argument (this.constructor, which is apiError) tells V8: "Hide the apiError constructor and everything above it from the stack."
       * */
    }
  }
}
export { apiError };
