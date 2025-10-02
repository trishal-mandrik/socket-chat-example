const express = require('express');
const {createServer} = require('node:http');
const {join} = require('node:path');
const {Server} = require('socket.io');
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')

// Initialize SQLite database
async function main() {
    const db = await open({
        // open the database file
        filename: 'chat.db',
        driver: sqlite3.Database
    })

    // create our 'messages' table (you can ignore the 'client_offset' column for now)
    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
        connectionStateRecovery: {}
    })

    app.get('/', (req, res) => {
        res.sendFile(join(__dirname, 'index.html'));
    })

    io.on('connection', async (socket) => {
        console.log('A user connected');

        socket.on('chat message', async (msg) => {
            console.log('message: ' + msg);
            let result;
            try {
                // store the message in the database
                result = await db.run('INSERT INTO messages (content) VALUES (?)', [msg]);
            } catch (e) {
                // TODO handle the failure
                return
            }
            // include the offset with the message
            io.emit('chat message', msg, result.lastID);
        });

        if (!socket.recovered) {
            // if the connection state recovery was not successful
            try {
                await db.each('SELECT id, content FROM messages WHERE id > ?',
                    [socket.handshake.auth.serverOffset || 0],
                    (_err, row) => {
                        socket.emit('chat message', row.content, row.id);
                    }
                )
            } catch (e) {
                // something went wrong
            }
        }

        socket.on('disconnect', () => {
            console.log('user disconnected');
        })
    })

    server.listen(3001, () => {
        console.log('Server is running on http://localhost:3001');
    });
}


main()