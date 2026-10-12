const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing. Configure backend/.env.");
  mongoose.set("strictQuery", true);
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("Connected to MongoDB at", uri);
  } catch (err) {
    console.warn(`Could not connect to MongoDB at ${uri} (${err.message}).`);
    console.log("Starting in-memory MongoDB server fallback...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create({
        binary: { version: "4.4.29" }
      });
      const memUri = mongoServer.getUri();
      await mongoose.connect(memUri);
      console.log("Connected to In-Memory MongoDB at", memUri);
    } catch (memErr) {
      console.error("Failed to start in-memory MongoDB fallback:", memErr.message);
      throw err;
    }
  }
}

module.exports = connectDb;

