const express = require("express");
const router = express.Router();

// সব routes এখানে একত্র করা হয়
// app.js এ শুধু একটি line: app.use("/api", routes)
router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));

// ভবিষ্যতে এখানে যোগ হবে:
// router.use("/income", require("./incomeRoutes"));
// router.use("/tds", require("./tdsRoutes"));
// router.use("/tax", require("./taxRoutes"));
// router.use("/return", require("./returnRoutes"));
// router.use("/admin", require("./adminRoutes"));

module.exports = router;
