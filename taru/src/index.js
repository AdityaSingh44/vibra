const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const { setupSocket } = require('./ws/socket');
const conversationsRouter = require('./routes/conversations');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => {
    const ok = mongoose.connection.readyState === 1
    res.json({ ok, mongoState: mongoose.connection.readyState })
})

app.use('/conversations', conversationsRouter);

const server = http.createServer(app);

setupSocket(server);

// Use MONGODB_URI from environment (.env). Do NOT hard-code credentials in source.
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('Missing required environment variable: MONGODB_URI. Please set it in your .env or environment before starting the server.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error', err.message))

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Taru server listening on http://localhost:${PORT}`);
});
