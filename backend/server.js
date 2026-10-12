const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const app = require("./src/app");
const connectDb = require("./src/db/db");

const port = Number(process.env.PORT || 3001);

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`Resume AI API listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Could not start API:", error.message);
    process.exit(1);
  });
