const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rooms storage
const rooms = {};

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMessage(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");
  safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  return safe;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("getRooms", (ack) => {
    ack(Object.keys(rooms));
  });

  socket.on("createRoom", ({ room }, ack) => {
    if (!room.trim()) return ack({ error: "Invalid room name" });

    if (!rooms[room]) rooms[room] = { users: {} };
    ack({ ok: true, rooms: Object.keys(rooms) });
    io.emit("roomsList", Object.keys(rooms));
  });

  socket.on("joinRoom", ({ username, room }, ack) => {
    if (!username || !room) return ack({ error: "Missing data" });

    username = username.trim();
    room = room.trim();

    if (!rooms[room]) rooms[room] = { users: {} };

    if (Object.values(rooms[room].users).includes(username)) {
      return ack({ error: "Username already taken in this room" });
    }

    rooms[room].users[socket.id] = username;
    socket.join(room);
    socket.username = username;
    socket.room = room;

    ack({ ok: true, users: Object.values(rooms[room].users) });

    io.to(room).emit("systemMessage", {
      system: true,
      text: `${username} joined.`,
      timestamp: Date.now(),
      users: Object.values(rooms[room].users),
    });
  });

  socket.on("sendMessage", ({ text }, ack) => {
    if (!text.trim()) return;
    const msg = {
      from: socket.username,
      html: formatMessage(text),
      timestamp: Date.now(),
    };
    io.to(socket.room).emit("message", msg);
    ack({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = socket.room;
    const username = socket.username;

    if (room && rooms[room]) {
      delete rooms[room].users[socket.id];

      io.to(room).emit("systemMessage", {
        system: true,
        text: `${username} left.`,
        timestamp: Date.now(),
        users: Object.values(rooms[room].users),
      });

      if (Object.keys(rooms[room].users).length === 0) {
        delete rooms[room];
        io.emit("roomsList", Object.keys(rooms));
      }
    }

    console.log("User disconnected:", socket.id);
  });
});

// ------- IMPORTANT FIX FOR OTHER LAPTOPS ----------
const PORT = 3000;
const LOCAL_IP = "192.168.29.130"; // your WiFi IPv4

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on:
  Local:   http://localhost:${PORT}
  Network: http://${LOCAL_IP}:${PORT}`);
});
