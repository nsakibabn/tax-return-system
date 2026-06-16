const { body, validationResult } = require("express-validator");

// Validation rules চালানোর পর error গুলো check করে response পাঠায়
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ─── Register Validation Rules ───
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Enter a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),

  body("tin")
    .optional()
    .trim()
    .isLength({ min: 10, max: 12 }).withMessage("TIN must be 10-12 digits")
    .isNumeric().withMessage("TIN must contain only numbers"),

  body("nid")
    .optional()
    .trim()
    .isLength({ min: 10, max: 17 }).withMessage("NID must be 10-17 digits")
    .isNumeric().withMessage("NID must contain only numbers"),

  handleValidationErrors,
];

// ─── Login Validation Rules ───
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Enter a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// ─── Change Password Validation Rules ───
const validateChangePassword = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Must contain at least one number"),

  handleValidationErrors,
];

// ─── Update Profile Validation Rules ───
const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),

  body("tin")
    .optional()
    .trim()
    .isLength({ min: 10, max: 12 }).withMessage("TIN must be 10-12 digits")
    .isNumeric().withMessage("TIN must contain only numbers"),

  body("nid")
    .optional()
    .trim()
    .isLength({ min: 10, max: 17 }).withMessage("NID must be 10-17 digits"),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
};
