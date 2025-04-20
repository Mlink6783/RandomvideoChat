import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css'; // Import the CSS

const socket = io('https://video-chat-server-u6vg.onrender.com');

function App() {
  const [username, setUsername] = useState('');
  const [inCall, setInCall] = useState(false);
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const localStream = useRef();

  useEffect(() => {
    socket.on('offer', async (offer) => {
      peerRef.current = createPeer(false); // Create peer when offer is received
      await peerRef.current.setRemoteDescription(offer);
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      await peerRef.current.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', (candidate) => {
      peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('disconnectPeer', () => {
      endCall();
    });

    return () => socket.disconnect();
  }, []);

  const startCall = async () => {
    localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.current.srcObject = localStream.current;
    socket.emit('ready');
  };

  // createPeer function for setting up peer connection
  const createPeer = (initiator = true) => {
    const peer = new RTCPeerConnection();

    // Log when an ICE candidate is found and send it to the server
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', e.candidate);
      }
    };

    // This event will be triggered when the other user’s stream is received
    peer.ontrack = (e) => {
      console.log("Remote stream received:", e);
      remoteVideo.current.srcObject = e.streams[0]; // Set the remote stream to the remote video element
    };

    // Add the local stream to the peer connection
    localStream.current.getTracks().forEach(track => peer.addTrack(track, localStream.current));

    if (initiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        socket.emit('offer', offer);
      });
    }

    return peer;
  };

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('join', username);
      setInCall(true);
      startCall();
    }
  };

  const handleNext = () => {
    socket.emit('next');
    endCall();
    startCall();
  };

  const endCall = () => {
    if (peerRef.current) peerRef.current.close();
    peerRef.current = null;
    remoteVideo.current.srcObject = null;
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="title">1v1 Video Chat</h1>
        <p>Connect with random users and chat via video!</p>
      </div>

      {!inCall ? (
        <div className="login-container">
          <h2>Enter your username</h2>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="username-input"
            placeholder="Your username"
          />
          <button onClick={handleLogin} className="login-button">Join</button>
        </div>
      ) : (
        <div className="video-chat-container">
          <div className="videos">
            <video ref={localVideo} autoPlay muted playsInline className="local-video" />
            <video ref={remoteVideo} autoPlay playsInline className="remote-video" />
          </div>
          <button onClick={handleNext} className="next-button">Next</button>
        </div>
      )}
    </div>
  );
}

export default App;
