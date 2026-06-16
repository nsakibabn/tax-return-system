// authorize("admin")           → শুধু admin যেতে পারবে
// authorize("admin", "tax_consultant") → দুজনেই যেতে পারবে
// authorize("user", "tax_consultant", "admin") → সবাই যেতে পারবে

const authorize = (...roles) => {
  return (req, res, next) => {
    // authenticate middleware আগেই req.user set করেছে
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user.role}' is not allowed to access this resource`
      );
    }
    next();
  };
};

module.exports = authorize;
