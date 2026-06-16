require("dotenv").config(); // সবার আগে .env load করতে হবে

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1); // Crash হলে process বন্ধ করো (PM2 restart করবে)
  }
};

startServer();
