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

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', username => {
    socket.username = username;
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

  socket.on('ready', () => {
    if (socket.partner) {
      socket.partner.emit('ready');
    }
  });

  socket.on('offer', offer => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  socket.on('answer', answer => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  socket.on('ice-candidate', candidate => {
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
    if (waitingUser === null) {
      waitingUser = socket;
    } else {
      const partner = waitingUser;
      waitingUser = null;
      socket.partner = partner;
      partner.partner = socket;

      socket.emit('offer-request');
      partner.emit('offer-request');
    }
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });
  let activeUsers = [];

io.on('connection', (socket) => {
    // Add the new user to the active users list
    activeUsers.push(socket);

    console.log("New user connected. Active users: ", activeUsers.length);

    // Handle "next" button click
    socket.on('next', () => {
        if (activeUsers.length > 1) {
            // Pick a random user from activeUsers list
            const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];

            // Emit to the current user
            socket.emit('matched', { userId: randomUser.id });

            // Emit to the random user to notify match
            randomUser.emit('matched', { userId: socket.id });
        }
    });

    // Remove user from activeUsers list on disconnect
    socket.on('disconnect', () => {
        activeUsers = activeUsers.filter((user) => user !== socket);
        console.log("User disconnected. Active users: ", activeUsers.length);
    });
});

});

server.listen(5000, () => console.log('Server running on port 5000'));
