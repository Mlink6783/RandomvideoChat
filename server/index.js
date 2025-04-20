const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let waitingUser = null;
let activeUsers = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Add new user to active users list
  activeUsers.push(socket);

  socket.on('join', (username) => {
    socket.username = username;

    // Try to match with a waiting user
    if (waitingUser) {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.emit('offer-request');
      partner.emit('offer-request');
    } else {
      waitingUser = socket;
    }
  });

  socket.on('next', () => {
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    socket.partner = null;

    if (activeUsers.length > 1) {
      activeUsers = activeUsers.filter(user => user !== socket);
      const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];

      socket.partner = randomUser;
      randomUser.partner = socket;

      socket.emit('offer-request');
      randomUser.emit('offer-request');
    } else {
      waitingUser = socket;
    }
  });

  socket.on('disconnect', () => {
    activeUsers = activeUsers.filter(user => user !== socket);
    if (waitingUser === socket) waitingUser = null;

    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));
