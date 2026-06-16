const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate");
const {
  validateRegister,
  validateLogin,
} = require("../validators/authValidator");

// Public routes (token ছাড়াই access করা যাবে)
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

// Protected route (token লাগবে)
router.get("/me", authenticate, getMe);

module.exports = router;
