const express = require('express');
const app = express();

const http = require('http');
const path = require('path');
const {Server} = require('socket.io');

const ACTIONS = require('./src/actions/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
/**
 * In-memory room state (cleared on server restart).
 * roomId -> { code: string, language: string, messages: Array<{id, username, text, ts} > }
 */
const roomState = new Map();

function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({roomId, username, createIfNotExists = false}) => {
        const safeRoomId = typeof roomId === 'string' ? roomId.trim() : '';
        const safeUsername = typeof username === 'string' ? username.trim() : '';

        if (!safeRoomId || !safeUsername) {
            io.to(socket.id).emit(ACTIONS.ROOM_ERROR, {
                message: 'Room ID and username are required.',
            });
            return;
        }

        const exists = roomState.has(safeRoomId);
        if (!exists && !createIfNotExists) {
            io.to(socket.id).emit(ACTIONS.ROOM_ERROR, {
                message: 'Invalid Room ID. Ask the host to share a valid Room ID, or create a new room.',
            });
            return;
        }

        if (!exists) {
            roomState.set(safeRoomId, {
                code: '',
                language: 'javascript',
                messages: [],
            });
        }

        userSocketMap[socket.id] = safeUsername;
        socket.join(safeRoomId);

        const clients = getAllConnectedClients(safeRoomId);
        const state = roomState.get(safeRoomId);

        // Notify everyone in room (including the joiner) + include latest room state.
        io.in(safeRoomId).emit(ACTIONS.JOINED, {
            clients,
            username: safeUsername,
            socketId: socket.id,
            room: {
                code: state?.code ?? '',
                language: state?.language ?? 'javascript',
            },
        });

        // Send chat history to the newly joined socket only.
        io.to(socket.id).emit(ACTIONS.CHAT_HISTORY, {
            messages: state?.messages ?? [],
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code}) => {
        const safeRoomId = typeof roomId === 'string' ? roomId.trim() : '';
        if (!safeRoomId || !roomState.has(safeRoomId)) return;

        const state = roomState.get(safeRoomId);
        state.code = typeof code === 'string' ? code : '';
        socket.in(safeRoomId).emit(ACTIONS.CODE_CHANGE, {code: state.code});
    });

    socket.on(ACTIONS.SYNC_CODE, ({socketId, code}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {code});
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({roomId, language}) => {
        const safeRoomId = typeof roomId === 'string' ? roomId.trim() : '';
        if (!safeRoomId || !roomState.has(safeRoomId)) return;

        const state = roomState.get(safeRoomId);
        state.language = typeof language === 'string' ? language : 'javascript';
        io.in(safeRoomId).emit(ACTIONS.LANGUAGE_CHANGE, {language: state.language});
    });

    socket.on(ACTIONS.CHAT_MESSAGE, ({roomId, text}) => {
        const safeRoomId = typeof roomId === 'string' ? roomId.trim() : '';
        if (!safeRoomId || !roomState.has(safeRoomId)) return;

        const messageText = typeof text === 'string' ? text.trim() : '';
        if (!messageText) return;

        const msg = {
            id: `${Date.now()}_${socket.id}`,
            username: userSocketMap[socket.id] || 'Anonymous',
            text: messageText,
            ts: Date.now(),
        };

        const state = roomState.get(safeRoomId);
        state.messages.push(msg);
        // Keep history bounded.
        if (state.messages.length > 200) state.messages.splice(0, state.messages.length - 200);

        io.in(safeRoomId).emit(ACTIONS.CHAT_MESSAGE, msg);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            // socket.rooms includes its own id; skip that pseudo-room.
            if (roomId === socket.id) return;

            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });

            // Update user list for remaining clients.
            const clients = getAllConnectedClients(roomId).filter((c) => c.socketId !== socket.id);
            io.in(roomId).emit(ACTIONS.USERS_UPDATE, {clients});

            // Cleanup state if room becomes empty.
            const remaining = io.sockets.adapter.rooms.get(roomId);
            if (!remaining || remaining.size <= 1) {
                // size includes disconnecting socket until fully gone; be conservative.
                setTimeout(() => {
                    const stillThere = io.sockets.adapter.rooms.get(roomId);
                    if (!stillThere || stillThere.size === 0) {
                        roomState.delete(roomId);
                    }
                }, 50);
            }
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// Serve response in production
app.get('/', (req, res) => {
    const htmlContent = '<h1>Welcome to CodeSync</h1><p>Real-time collaborative code editing.</p>';
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

const PORT = process.env.SERVER_PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));