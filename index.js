const express = require('express');
const {createServer} = require('node:http');
const {join} = require('node:path');
const {Server} = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server)

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
})

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    })
})

server.listen(3001, () => {
    console.log('Server is running on http://localhost:3001');
});