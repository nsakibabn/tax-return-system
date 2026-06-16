// Controller function কে wrap করে
// Error হলে automatically next(error) পাঠায়
// ফলে প্রতিটি controller এ try/catch লিখতে হয় না
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
