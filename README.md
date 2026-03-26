# CodeSync

Collaborate and code together in real time.

CodeSync is a real-time collaborative code editor where multiple users can join a room and edit the same code instantly—plus a built-in chat to coordinate while you work.

## Features

- **Real-time collaboration**: simultaneous code edits synchronized across all clients
- **Room system**: create a room or join using a room ID
- **Multi-user editing**: see active collaborators in the room
- **Chat system**: send room messages with your username

## Tech Stack

- **React** (frontend)
- **Node.js + Express** (server)
- **Socket.IO** (real-time events)
- **Monaco Editor** (syntax highlighting + code editing)

## Setup (Local Development)

### 1) Install dependencies

From the repository root:

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the repository root by copying `example.env`, then set:

```bash
REACT_APP_BACKEND_URL=http://localhost:5000
SERVER_PORT=5000
```

### 3) Run the frontend

Terminal 1:

```bash
npm start
```

### 4) Run the backend

Terminal 2:

```bash
npm run server:dev
```

Then open:

- **Frontend**: `http://localhost:3000`

## Docker (Optional)

```bash
docker-compose up -d
```

Then open:

- **Frontend**: `http://localhost:3000`



