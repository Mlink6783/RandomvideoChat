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
let activeUsers = []; // To keep track of all connected users

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Add the new user to the active users list
  activeUsers.push(socket);
  console.log("New user connected. Active users: ", activeUsers.length);

  socket.on('join', (username) => {
    socket.username = username;

    // If there is a waiting user, connect both users
    if (waitingUser) {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.emit('offer-request');
      partner.emit('offer-request');
    } else {
      // Otherwise, add the current user to the waiting list
      waitingUser = socket;
    }
  });

  socket.on('ready', () => {
    if (socket.partner) {
      socket.partner.emit('ready');
    }
  });

  socket.on('offer', (offer) => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  socket.on('answer', (answer) => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  socket.on('ice-candidate', (candidate) => {
    if (socket.partner) {
      socket.partner.emit('ice-candidate', candidate);
    }
  });

  socket.on('next', () => {
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    socket.partner = null;

    // Try to match with a new random user
    if (activeUsers.length > 1) {
      // Remove the current user from the active users list
      activeUsers = activeUsers.filter(user => user !== socket);

      // Pick a random user from the active users list
      const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];

      // Match the users
      socket.partner = randomUser;
      randomUser.partner = socket;

      socket.emit('offer-request');
      randomUser.emit('offer-request');
    } else {
      // If no other user is available, add the current user to the waiting list
      waitingUser = socket;
    }
  });

  socket.on('disconnect', () => {
    // Remove user from active users list
    activeUsers = activeUsers.filter(user => user !== socket);
    console.log("User disconnected. Active users: ", activeUsers.length);

    // If the user was waiting, clear waitingUser
    if (waitingUser === socket) waitingUser = null;

    // Disconnect the partner
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });

  // Handle user disconnecting or leaving the call
  socket.on('disconnectPeer', () => {
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));
