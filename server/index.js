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
});

server.listen(5000, () => console.log('Server running on port 5000'));