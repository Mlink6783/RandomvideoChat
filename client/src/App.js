import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://video-chat-server-u6vg.onrender.com'); // Replace with your backend URL

function App() {
  const [username, setUsername] = useState('');
  const [inCall, setInCall] = useState(false);
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const localStream = useRef();

  useEffect(() => {
    socket.on('offer', async (offer) => {
      peerRef.current = createPeer(false);
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

  const createPeer = (initiator = true) => {
    const peer = new RTCPeerConnection();
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', e.candidate);
    };
    peer.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };
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
    startCall(); // Only reinitialize local media once
  };

  const endCall = () => {
    if (peerRef.current) peerRef.current.close();
    peerRef.current = null;
    remoteVideo.current.srcObject = null;
  };

  const isMobile = window.innerWidth < 600;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: 'auto', textAlign: 'center' }}>
      {!inCall ? (
        <div>
          <h2>Enter your username</h2>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ padding: 10, width: '80%', maxWidth: 300, marginBottom: 10 }}
          />
          <br />
          <button onClick={handleLogin} style={{ padding: '10px 20px' }}>Join</button>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <video ref={localVideo} autoPlay muted playsInline style={{ width: '100%', maxWidth: 300, borderRadius: 10 }} />
            <video ref={remoteVideo} autoPlay playsInline style={{ width: '100%', maxWidth: 300, borderRadius: 10 }} />
          </div>
          <button onClick={handleNext} style={{ marginTop: 20, padding: '10px 20px' }}>Next</button>
        </div>
      )}
    </div>
  );
}

export default App;
