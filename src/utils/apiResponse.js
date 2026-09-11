class apiResponse {
  constructor(
    statusCode,
    data,
    message = "default message here which is success"
  ) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    // now while it isnt passed in constructor itself  we also give a  status flag which is true for statuses 200 - 399
    this.success = statusCode < 400 && statusCode > 199;
  }
}

export { apiResponse };
