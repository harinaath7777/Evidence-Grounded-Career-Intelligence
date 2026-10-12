const mongoose = require("mongoose");

let cachedPromise = null;

async function connectDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const error = new Error("MONGODB_URI is missing. Please configure MONGODB_URI in Vercel Environment Variables.");
    error.status = 500;
    throw error;
  }

  mongoose.set("strictQuery", true);

  cachedPromise = (async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to MongoDB successfully");
      return mongoose.connection;
    } catch (err) {
      cachedPromise = null;
      if (process.env.VERCEL || process.env.NODE_ENV === "production") {
        console.error("MongoDB connection error on production:", err.message);
        const error = new Error(`Database connection failed: ${err.message}. Verify MONGODB_URI in Vercel and check that MongoDB Atlas Network Access whitelist includes 0.0.0.0/0.`);
        error.status = 500;
        throw error;
      }

      console.warn(`Could not connect to MongoDB at ${uri} (${err.message}). Starting in-memory fallback...`);
      try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create({
          binary: { version: "4.4.29" }
        });
        const memUri = mongoServer.getUri();
        await mongoose.connect(memUri);
        console.log("Connected to In-Memory MongoDB at", memUri);
        return mongoose.connection;
      } catch (memErr) {
        console.error("Failed to start in-memory MongoDB fallback:", memErr.message);
        throw err;
      }
    }
  })();

  return cachedPromise;
}

module.exports = connectDb;

