const asyncHandler = require("../middlewares/asyncHandler");
const authService = require("../services/authService");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, tin, nid } = req.body;

  const result = await authService.registerUser({ name, email, password, tin, nid });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: result,
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

// GET /api/auth/me  [Protected]
const getMe = asyncHandler(async (req, res) => {
  // req.user authenticate middleware এ set হয়েছে
  const user = await authService.getProfile(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

module.exports = { register, login, getMe };
