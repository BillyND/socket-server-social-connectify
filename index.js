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

let users = [];

// Socket.io functions
const handleUpdatePost = (post, targetSocketId) => {
  io.emit("getPost", { ...post, targetSocketId });
};

const handleUpdateComment = (comment, targetSocketId) => {
  io.emit("getComment", { ...comment, targetSocketId });
};

const handleChangeData = (data) => {
  comments = data;
  io.emit("getData", initData);
};

const handleAddUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
  io.emit("getUsers", users);
};

const handleSendMessage = ({ senderId, receiverId, text }) => {
  const user = getUser(receiverId);
  io.to(user?.socketId).emit("getMessage", { senderId, text });
};

const handleDisconnect = (socketId) => {
  io.emit("getUsers", users);
};

// Socket.io event listeners
io.on("connection", (socket) => {
  // Post
  socket.on("updatePost", (post) => handleUpdatePost(post, socket.id));

  //Comment
  socket.on("updateComment", (comment) =>
    handleUpdateComment(comment, socket.id)
  );
  socket.on("changeData", handleChangeData);
  socket.on("addUser", (userId) => handleAddUser(userId, socket.id));
  socket.on("sendMessage", handleSendMessage);
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
