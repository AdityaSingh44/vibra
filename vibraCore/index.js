require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();
app.use(cors());
app.use(express.json());

// static uploads
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => console.log('Server started on', PORT));
    })
    .catch(err => {
        console.error('MongoDB connection error', err && err.message);
        console.error('Starting server in MOCK_DB mode (in-memory)');
        // enable mock DB mode for development if Mongo fails
        global.MOCK_DB = true;
        global.__mockUsers = global.__mockUsers || [];
        global.__mockPosts = global.__mockPosts || [];
        app.listen(PORT, () => console.log('Server started on', PORT, '(MOCK_DB)'));
    });
