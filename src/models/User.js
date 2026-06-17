const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,       // duplicate email হবে না (index তৈরি করে)
      lowercase: true,    // "ALI@gmail.com" → "ali@gmail.com" auto convert
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // default এ password আসবে না — security এর জন্য
                     // explicitly .select("+password") দিলে তবেই আসবে
    },

    // Tax Identification Number (optional কারণ profile এ আলাদাভাবে নেওয়া হবে)
    tin: {
      type: String,
      trim: true,
      sparse: true, // null/undefined হলেও unique index কাজ করবে
      unique: true,
    },

    // National ID (optional)
    nid: {
      type: String,
      trim: true,
    },

    // তিনটি role:
    // user           → সাধারণ taxpayer
    // tax_consultant → CA বা Tax Advisor (ভবিষ্যতে)
    // admin          → System administrator
    role: {
      type: String,
      enum: {
        values: ["user", "tax_consultant", "admin"],
        message: "Role must be user, tax_consultant, or admin",
      },
      default: "user",
    },

    // false হলে login করতে পারবে না (Admin deactivate করতে পারবে)
    isActive: {
      type: Boolean,
      default: true,
    },

    // Password কখন পরিবর্তিত হয়েছে (JWT security এর জন্য — future use)
    passwordChangedAt: {
      type: Date,
    },

    // সর্বশেষ login এর সময়
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt ও updatedAt auto add করবে
  }
);

// ─────────────────────────────────────────────────────────
// PRE-SAVE HOOK: Password Hash করা
// ─────────────────────────────────────────────────────────
// যখনই user save হবে (register বা password update) তখন চলবে
// password পরিবর্তন না হলে (শুধু name update) এই hook skip করবে
// Mongoose 9: async hook এ next() call করতে হয় না — শুধু return করলেই হয়
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);

  if (!this.isNew) {
    this.passwordChangedAt = Date.now();
  }
});

// ─────────────────────────────────────────────────────────
// INSTANCE METHOD: Password Verify করা
// ─────────────────────────────────────────────────────────
// user.matchPassword("MyPass123") → true বা false
userSchema.methods.matchPassword = async function (enteredPassword) {
  // this.password = hashed password (database এ যা আছে)
  // enteredPassword = user যা type করেছে
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─────────────────────────────────────────────────────────
// INSTANCE METHOD: JWT Token Generate করা
// ─────────────────────────────────────────────────────────
// user.getSignedToken() → "eyJhbGciOi..."
userSchema.methods.getSignedToken = function () {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { id: this._id, role: this.role },  // payload
    process.env.JWT_SECRET,             // secret key
    { expiresIn: process.env.JWT_EXPIRE || "7d" } // মেয়াদ
  );
};

const User = mongoose.model("User", userSchema);

module.exports = User;
