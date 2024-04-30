const http = require("http");
const socketio = require("socket.io");

// Object to store user information and their socketIds
let users = {};

const getOtherSocketIds = (currentSocketId) =>
  Object.values(users).filter((item) => item !== currentSocketId);

// Socket.io functions
const handleUpdatePost = (io, post, targetSocketId) => {
  io.emit("getPost", {
    ...post,
    targetSocketId,
  });
};

const handleUpdateComment = (io, comment, targetSocketId) => {
  io.emit("getComment", { ...comment, targetSocketId });
};

const handleAddUser = (io, userId, socketId) => {
  users[userId] = socketId;
  io.emit("getUsers", users);
};

const handleDisconnect = (io, socketId) => {
  // Remove user from the list upon disconnection
  const disconnectedUserId = Object.keys(users).find(
    (userId) => users[userId] === socketId
  );
  if (disconnectedUserId) {
    delete users[disconnectedUserId];
    io.emit("getUsers", users);
  }
};

const handleSendMessage = (io, data, targetSocketId) => {
  io.emit("getMessage", { ...data, targetSocketId });
};

const setupSocketIO = (app) => {
  const httpServer = http.createServer(app);
  const io = socketio(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // Socket.io event listeners
  io.on("connection", (socket) => {
    // Process post
    socket.on("updatePost", (post) => handleUpdatePost(io, post, socket.id));
    socket.on("updateComment", (comment) =>
      handleUpdateComment(io, comment, socket.id)
    );
    socket.on("addUser", (userId) => handleAddUser(io, userId, socket.id));
    socket.on("disconnect", () => handleDisconnect(io, socket.id));

    // Process message
    socket.on("sendMessage", (data) => handleSendMessage(io, data, socket.id));
  });

  return httpServer;
};

module.exports = setupSocketIO;
