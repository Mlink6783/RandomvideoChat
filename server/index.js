// In server/index.js
let waitingUser = null;
let activeUsers = []; // Track all active users

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', username => {
    socket.username = username;
    activeUsers.push(socket); // Add user to the activeUsers list

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
      socket.partner.emit('disconnectPeer'); // Disconnect the partner
      socket.partner.partner = null;
      socket.partner = null;
    }
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
    activeUsers = activeUsers.filter(user => user !== socket);
    console.log("User disconnected. Active users: ", activeUsers.length);

    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
  });
});
Client Side (App.js):
The next button click should trigger a reconnection and properly match with another user.

Here’s the updated logic for the client-side handleNext function:

javascript
Copy
Edit
const handleNext = () => {
  socket.emit('next');  // Emit "next" event to backend to find a new partner
  endCall();
  startCall();  // Start a new call after disconnecting the current one
};

const endCall = () => {
  if (peerRef.current) peerRef.current.close();
  if (localStream.current) {
    localStream.current.getTracks().forEach(track => track.stop());  // Stop tracks to release camera/microphone
  }
  peerRef.current = null;
  remoteVideo.current.srcObject = null;
};
