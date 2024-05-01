const http = require("http");
const socketio = require("socket.io");

// Object to store user information and their socketIds
const connectedUsers = {};

const getOtherSocketIds = (currentSocketId) =>
  Object.values(connectedUsers).filter(
    (socketId) => socketId !== currentSocketId
  );

// Socket.io functions
const emitPostUpdate = (io, post, targetSocketId) => {
  io.emit("getPost", {
    ...post,
    targetSocketId,
  });
};

const emitCommentUpdate = (io, comment, targetSocketId) => {
  io.emit("getComment", { ...comment, targetSocketId });
};

const connectUser = (io, userId, socketId) => {
  connectedUsers[userId] = socketId;
};

const disconnectUser = (io, socketId) => {
  // Remove user from the list upon disconnection
  const disconnectedUserId = Object.keys(connectedUsers).find(
    (userId) => connectedUsers[userId] === socketId
  );

  if (disconnectedUserId) {
    delete connectedUsers[disconnectedUserId];
  }
};

const emitSendMessage = (io, data, targetSocketId) => {
  const { userId, receiverId } = data || {};

  [userId, receiverId].forEach((id) => {
    if (id && connectedUsers[id]) {
      io.to(connectedUsers[id]).emit("getMessage", { ...data, targetSocketId });
    }
  });
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
    socket.on("updatePost", (post) => emitPostUpdate(io, post, socket.id));
    socket.on("updateComment", (comment) =>
      emitCommentUpdate(io, comment, socket.id)
    );
    socket.on("connectUser", (userId) => connectUser(io, userId, socket.id));
    socket.on("disconnect", () => disconnectUser(io, socket.id));

    // Process message
    socket.on("sendMessage", (data) => emitSendMessage(io, data, socket.id));
  });

  return httpServer;
};

module.exports = setupSocketIO;
