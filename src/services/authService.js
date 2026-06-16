const User = require("../models/User");

// ─────────────────────────────────────────────────────────
// Register: নতুন user তৈরি করা
// ─────────────────────────────────────────────────────────
const registerUser = async ({ name, email, password, tin, nid }) => {
  // Email already exists কিনা check (Model এ unique আছে, কিন্তু
  // আগেই check করলে ভালো error message দেওয়া যায়)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 409; // Conflict
    throw error;
  }

  // User তৈরি করো (password pre-save hook এ hash হবে)
  const user = await User.create({ name, email, password, tin, nid });

  // JWT token generate করো
  const token = user.getSignedToken();

  return { user: sanitizeUser(user), token };
};

// ─────────────────────────────────────────────────────────
// Login: email + password verify করে token দেওয়া
// ─────────────────────────────────────────────────────────
const loginUser = async ({ email, password }) => {
  // password select: false থাকায় explicitly +password দিতে হবে
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
    // ⚠️ "Email not found" বলা যাবে না — attacker কে hint দেবে না
  }

  // Account active আছে কিনা
  if (!user.isActive) {
    const error = new Error("Your account has been deactivated. Contact admin.");
    error.statusCode = 403;
    throw error;
  }

  // Password verify করো
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // সর্বশেষ login time আপডেট করো
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false }); // validation skip (only updating lastLoginAt)

  const token = user.getSignedToken();

  return { user: sanitizeUser(user), token };
};

// ─────────────────────────────────────────────────────────
// Get Profile: নিজের তথ্য দেখা
// ─────────────────────────────────────────────────────────
const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return sanitizeUser(user);
};

// ─────────────────────────────────────────────────────────
// Update Profile: নাম, TIN, NID আপডেট করা
// ─────────────────────────────────────────────────────────
const updateProfile = async (userId, updates) => {
  // শুধু এই fields update করতে দেওয়া হবে — role বা isActive নয়
  const allowedFields = ["name", "tin", "nid"];
  const filteredUpdates = {};

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    userId,
    filteredUpdates,
    { new: true, runValidators: true }
  );

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
};

// ─────────────────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password");

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword; // pre-save hook এ hash হবে
  await user.save();

  return { message: "Password changed successfully" };
};

// ─────────────────────────────────────────────────────────
// Helper: Response এ password বা sensitive field বাদ দেওয়া
// ─────────────────────────────────────────────────────────
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  tin: user.tin,
  nid: user.nid,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
};
