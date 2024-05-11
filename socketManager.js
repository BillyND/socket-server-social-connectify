const http = require("http");
const socketio = require("socket.io");

// Object to store user information and their socketIds
let timerConnect, timerDisconnect;
const infoUserOnline = {};
const connectedUsers = {};
const userSockets = {};

const getUsersOnline = () => {
  const usersOnline = {};

  for (const userId in connectedUsers) {
    usersOnline[userId] = true;
  }

  return usersOnline;
};

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

const connectUser = (io, data, socketId) => {
  const { userId } = data || {};
  const isExistSocketId = connectedUsers[userId]?.includes(socketId);

  if (userId && !isExistSocketId) {
    connectedUsers[userId] = connectedUsers[userId] || [];
    connectedUsers[userId].push(socketId);
    infoUserOnline[userId] = data;
    userSockets[socketId] = userId;

    clearAndEmitUsersOnline(io);
  }
};

const disconnectUser = (io, socketId) => {
  const userId = userSockets[socketId];

  if (userId && connectedUsers[userId]) {
    connectedUsers[userId] = connectedUsers[userId].filter(
      (id) => id !== socketId
    );

    if (connectedUsers[userId].length === 0) {
      delete connectedUsers[userId];
      delete infoUserOnline[userId];
    }
  }

  delete userSockets[socketId];
  clearAndEmitUsersOnline(io);
};

const clearAndEmitUsersOnline = (io, timeout = 500) => {
  clearTimeout(timerConnect);

  timerConnect = setTimeout(() => {
    const usersOnline = getUsersOnline();

    console.log("===>usersOnline", usersOnline);

    io.emit("usersOnline", { usersOnline, infoUserOnline });
  }, timeout);
};

const emitSendMessage = (io, data, targetSocketId) => {
  const { userId, receiverId } = data || {};

  [userId, receiverId].forEach((id) => {
    if (id && connectedUsers[id]) {
      connectedUsers[id].forEach((socketId) => {
        io.to(socketId).emit("getMessage", { ...data, targetSocketId });
      });
    }
  });
};

const emitUserTyping = (io, data, targetSocketId) => {
  const { receiverId } = data || {};

  [receiverId].forEach((id) => {
    if (id && connectedUsers[id]) {
      connectedUsers[id].forEach((socketId) => {
        io.to(socketId).emit("receiveUserTyping", {
          ...data,
          targetSocketId,
        });
      });
    }
  });
};

const emitReadMessage = (io, data, targetSocketId) => {
  const { receiverId } = data || {};

  [receiverId].forEach((id) => {
    if (id && connectedUsers[id] && receiverId !== connectedUsers[id]) {
      connectedUsers[id].forEach((socketId) => {
        io.to(socketId).emit("receiveReadMessage", {
          ...data,
          targetSocketId,
        });
      });
    }
  });
};

const setupSocketIO = (app) => {
  const httpServer = http.createServer(app);
  const io = socketio(httpServer, {
    cors: {
      origin: "*",
    },
    transports: ["websocket"],
    reconnection: true, // Enable reconnection
    reconnectionDelay: 1000, // Initial delay before attempting to reconnect
    reconnectionAttempts: Infinity, // Number of reconnection attempts (-1 for infinite)
  });

  // Socket.io event listeners
  io.on("connection", (socket) => {
    // Start a heartbeat interval for this socket
    const heartbeatInterval = setInterval(() => {
      socket.emit("heartbeat");
    }, 1000); // Send heartbeat every 5 seconds

    // Listen for disconnect event
    socket.on("disconnect", () => {
      // Clear the heartbeat interval when the socket disconnects
      clearInterval(heartbeatInterval);
      disconnectUser(io, socket.id);
    });

    socket.on("updatePost", (post) => emitPostUpdate(io, post, socket.id));
    socket.on("updateComment", (comment) =>
      emitCommentUpdate(io, comment, socket.id)
    );

    socket.on("connectUser", (data) => connectUser(io, data, socket.id));
    socket.on("sendMessage", (data) => emitSendMessage(io, data, socket.id));
    socket.on("userTyping", (data) => emitUserTyping(io, data, socket.id));
    socket.on("readMessage", (data) => emitReadMessage(io, data, socket.id));
  });

  return httpServer;
};

module.exports = setupSocketIO;
