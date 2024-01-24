const socketio = require("socket.io");
const http = require("http");
const express = require("express");

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
const handleUpdatePost = (post) => {
  io.emit("getPost", post);
};

const handleUpdateComment = (post) => {
  io.emit("getComment", post);
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
  console.log("===>connect");
  // Post
  socket.on("updatePost", handleUpdatePost);

  //Comment
  socket.on("updateComment", handleUpdateComment);
  socket.on("changeData", handleChangeData);
  socket.on("addUser", (userId) => handleAddUser(userId, socket.id));
  socket.on("sendMessage", handleSendMessage);
  socket.on("disconnect", () => handleDisconnect(socket.id));
});

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
