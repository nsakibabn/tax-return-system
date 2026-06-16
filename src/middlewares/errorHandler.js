const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // MongoDB: ভুল format এর ID (যেমন "abc" এর বদলে ObjectId লাগে)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID: ${err.value}`;
  }

  // MongoDB: required field না দিলে বা type ভুল হলে
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // MongoDB: unique field এ duplicate value দিলে (যেমন same email দুবার)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // JWT: token নষ্ট হলে
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // JWT: token মেয়াদ শেষ
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired, please login again";
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Development এ stack trace দেখাও, Production এ লুকাও
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
