const app = require('./app');
const { initDatabase } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize DB connection, schema & seeds
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 TrustRox RESTful API Server running on port ${PORT}`);
      console.log(`📡 Base URL: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
