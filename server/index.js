/**
 * NATILLERA - BINGO WEBSOCKET RELAY
 * Servidor simple para sincronización en tiempo real
 */
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bingo Sync Server is Running');
});

const wss = new WebSocketServer({ server });

// Mapa de salas: juegoId -> Set de clientes
const rooms = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');
    let currentRoom = null;
    let userIdentity = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch(message.type) {
                case 'join':
                    // Unirse a una sala específica de juego
                    currentRoom = message.room;
                    userIdentity = message.identity;
                    
                    if (!rooms.has(currentRoom)) {
                        rooms.set(currentRoom, new Set());
                    }
                    rooms.get(currentRoom).add(ws);
                    console.log(`User ${userIdentity} joined room ${currentRoom}`);
                    break;
                
                case 'ball-drawn':
                case 'chat-message':
                case 'bingo-shout':
                case 'game-finished':
                    // Retransmitir mensaje a todos en la sala (excepto al que envía si es necesario, 
                    // pero para simplicidad a todos)
                    if (currentRoom && rooms.has(currentRoom)) {
                        const payload = JSON.stringify(message);
                        rooms.get(currentRoom).forEach(client => {
                            if (client.readyState === 1) { // OPEN
                                client.send(payload);
                            }
                        });
                    }
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            }
        }
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});
