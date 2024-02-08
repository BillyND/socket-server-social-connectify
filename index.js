const socketio = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 8089;

// Set up socket.io server
const httpServer = http.createServer(app);
const io = socketio(httpServer, {
  cors: {
    origin: "*",
  },
});

// Object to store user information and their socketIds
let users = {};

const getOtherSocketIds = (currentSocketId) =>
  Object.values(users).filter((item) => item !== currentSocketId);

// Socket.io functions
const handleUpdatePost = (post, targetSocketId) => {
  const { userId } = post || {};
  const currentSocketId = users[userId];

  io.to(getOtherSocketIds(currentSocketId)).emit("getPost", {
    ...post,
    targetSocketId,
  });
};

const handleUpdateComment = (comment, targetSocketId) => {
  io.emit("getComment", { ...comment, targetSocketId });
};

const handleAddUser = (userId, socketId) => {
  users[userId] = socketId;
  io.emit("getUsers", users);
};

const handleDisconnect = (socketId) => {
  // Remove user from the list upon disconnection
  const disconnectedUserId = Object.keys(users).find(
    (userId) => users[userId] === socketId
  );
  if (disconnectedUserId) {
    delete users[disconnectedUserId];
    io.emit("getUsers", users);
  }
};

// Socket.io event listeners
io.on("connection", (socket) => {
  console.log("===>connection:", socket.id);

  // Register events from client
  socket.on("updatePost", (post) => handleUpdatePost(post, socket.id));
  socket.on("updateComment", (comment) =>
    handleUpdateComment(comment, socket.id)
  );
  socket.on("addUser", (userId) => handleAddUser(userId, socket.id));
  socket.on("disconnect", () => handleDisconnect(socket.id));
});

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
