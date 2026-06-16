const jwt = require("jsonwebtoken");
const asyncHandler = require("./asyncHandler");
const User = require("../models/User");

// Protect করা routes এর জন্য — JWT token verify করে
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Token দুটি জায়গা থেকে নিতে পারি:
  // ১. Authorization header: "Bearer eyJhbG..."
  // ২. Cookie (এখনো implement নেই — future এর জন্য রেখেছি)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  // Token verify করো (ভুল বা মেয়াদোত্তীর্ণ হলে error throw করবে)
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // decoded = { id: "userId", role: "user", iat: ..., exp: ... }

  // Database থেকে user নিয়ে আসো — password বাদ দিয়ে
  // কারণ: token চুরি হলেও যদি user delete/deactivate হয় তাহলে block হবে
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    res.status(401);
    throw new Error("User no longer exists");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your account has been deactivated");
  }

  // পরবর্তী middleware বা controller এ user info পাঠাও
  req.user = user;
  next();
});

module.exports = authenticate;
