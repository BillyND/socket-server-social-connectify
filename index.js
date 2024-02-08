const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const setupSocketIO = require("./socketManager");

const app = express();
const PORT = 8089;

// Set up socket.io server
const httpServer = setupSocketIO(app);

// Express middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default route
app.get("/", (req, res) => {
  res.send({
    EC: 0,
    message: `<=== Socket server is running on port ${PORT} ===>`,
  });
});

// Connect to the database and start the server
(async () => {
  try {
    httpServer.listen(PORT, () =>
      console.log(`<=== Socket is running on port ${PORT} ===>`)
    );
  } catch (error) {
    console.log("===> Error connecting to the database", error);
  }
})();
