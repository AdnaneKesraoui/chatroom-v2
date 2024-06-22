const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatCord Bot";

// Predefined rooms
const predefinedRooms = [
  "JavaScript",
  "Python",
  "PHP",
  "C#",
  "Ruby",
  "Java"
];

const rooms = {};

// Add predefined rooms to the rooms object
predefinedRooms.forEach(room => {
  rooms[room] = { users: [] };
});

(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();

// Serve predefined rooms
app.get("/rooms", (req, res) => {
  res.json(predefinedRooms);
});

// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);

  socket.on("createRoom", (room, callback) => {
    console.log(`Create room request received for room: ${room}`);
    if (!rooms[room]) {
      rooms[room] = { users: [] };
      console.log(`Room created: ${room}`);
      callback(); // No error, room created
    } else {
      console.log(`Room already exists: ${room}`);
      callback("Room already exists");
    }
  });

  socket.on("joinRoom", ({ username, room }) => {
    if (rooms[room]) {
      const user = userJoin(socket.id, username, room);
      socket.join(user.room);
      rooms[room].users.push(user);

      // Welcome current user
      socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

      // Broadcast when a user connects
      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          formatMessage(botName, `${user.username} has joined the chat`)
        );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    } else {
      socket.emit("error", "Room does not exist");
    }
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });

      rooms[user.room].users = rooms[user.room].users.filter(
        (u) => u.id !== user.id
      );
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
