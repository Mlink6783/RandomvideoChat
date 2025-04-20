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

let waitingUser = null; // Track the user waiting for a match
let activeUsers = []; // Track all active users

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  // Add the new user to the activeUsers list
  activeUsers.push(socket);

  socket.on('join', username => {
    socket.username = username;
    console.log(`${username} joined the chat`);

    // If there is already a user waiting, pair them up
    if (waitingUser) {
      const partner = waitingUser;
      waitingUser = null;

      socket.partner = partner;
      partner.partner = socket;

      // Notify both users to start the offer-request process
      socket.emit('offer-request');
      partner.emit('offer-request');
    } else {
      // If no one is waiting, the current user will wait for a match
      waitingUser = socket;
    }
  });

  // Handle the "ready" signal when users are ready to start the call
  socket.on('ready', () => {
    if (socket.partner) {
      socket.partner.emit('ready');
    }
  });

  // Handle the offer received from the peer
  socket.on('offer', offer => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  // Handle the answer received from the peer
  socket.on('answer', answer => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  // Handle the ICE candidate message for peer-to-peer connection
  socket.on('ice-candidate', candidate => {
    if (socket.partner) {
      socket.partner.emit('ice-candidate', candidate);
    }
  });

  // Handle the "next" button click - disconnect the current peer and find a new partner
  socket.on('next', () => {
    if (socket.partner) {
      // Disconnect the current partner
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
      socket.partner = null;
    }

    // If no one is currently waiting, add the current user to the waiting list
    if (waitingUser === null) {
      waitingUser = socket;
    } else {
      // Otherwise, find a partner from the waiting user list
      const partner = waitingUser;
      waitingUser = null;
      socket.partner = partner;
      partner.partner = socket;

      // Notify both users to start the offer-request process
      socket.emit('offer-request');
      partner.emit('offer-request');
    }
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers = activeUsers.filter(user => user !== socket); // Remove the user from the active users list

    // If the user was waiting for a match, clear the waitingUser
    if (waitingUser === socket) waitingUser = null;

    // If the user had a partner, notify the partner that the peer is disconnected
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });

  // Display active users count when someone connects
  console.log("Active users: ", activeUsers.length);
});

server.listen(5000, () => console.log('Server running on port 5000'));
