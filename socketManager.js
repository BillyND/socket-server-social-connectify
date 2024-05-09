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

  if (userId) {
    connectedUsers[userId] = connectedUsers[userId] || [];
    connectedUsers[userId].push(socketId);
    infoUserOnline[userId] = data;
    userSockets[socketId] = userId;

    clearAndEmitUsersOnline(io);
  }
};

const disconnectUser = (io, socketId) => {
  const userId = userSockets[socketId];

  console.log("===>disconnect", userId);

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
    io.emit("usersOnline", { usersOnline, infoUserOnline });
  }, timeout);
};

const checkConnect = (io, userId) => {
  [userId].forEach((id) => {
    if (id && connectedUsers[id]) {
      connectedUsers[id].forEach((socketId) => {
        io.to(socketId).emit("receiveConnect", { online: true });
      });
    }
  });
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
    if (id && connectedUsers[id]) {
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
  });

  // Socket.io event listeners
  io.on("connection", (socket) => {
    socket.on("updatePost", (post) => emitPostUpdate(io, post, socket.id));
    socket.on("updateComment", (comment) =>
      emitCommentUpdate(io, comment, socket.id)
    );

    socket.on("connectUser", (data) => connectUser(io, data, socket.id));
    socket.on("checkConnect", (userId) => checkConnect(io, userId, socket.id));
    socket.on("disconnect", () => disconnectUser(io, socket.id));

    socket.on("sendMessage", (data) => emitSendMessage(io, data, socket.id));
    socket.on("userTyping", (data) => emitUserTyping(io, data, socket.id));
    socket.on("readMessage", (data) => emitReadMessage(io, data, socket.id));
  });

  return httpServer;
};

module.exports = setupSocketIO;
