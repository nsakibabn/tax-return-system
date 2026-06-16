const asyncHandler = require("../middlewares/asyncHandler");
const authService = require("../services/authService");

// GET /api/users/profile  [Protected]
const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// PUT /api/users/profile  [Protected]
const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// PUT /api/users/change-password  [Protected]
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(req.user._id, {
    currentPassword,
    newPassword,
  });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = { getProfile, updateProfile, changePassword };
