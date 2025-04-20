# 1v1 Video Chat App

## Setup

### Server (backend)
```bash
cd server
npm install
npm start
```

### Client (frontend)
```bash
cd client
npm install
npm start
```

### Deployment
- Backend: Deploy `/server` to Render (Node.js server)
- Frontend: Deploy `/client` to Vercel or Netlify after running `npm run build`
- Update frontend `socket.io-client` URL from `http://localhost:5000` to your Render backend URL