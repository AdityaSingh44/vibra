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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://root:root@completecoding.qy8jdg8.mongodb.net/taru?retryWrites=true&w=majority&appName=CompleteCoding'

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error', err.message))

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Taru server listening on http://localhost:${PORT}`);
});
