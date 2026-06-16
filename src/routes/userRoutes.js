const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/userController");
const authenticate = require("../middlewares/authenticate");
const {
  validateUpdateProfile,
  validateChangePassword,
} = require("../validators/authValidator");

// সব route এ authenticate লাগবে
router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", validateUpdateProfile, updateProfile);
router.put("/change-password", validateChangePassword, changePassword);

module.exports = router;
