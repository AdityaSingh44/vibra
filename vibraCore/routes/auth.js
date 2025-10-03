const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

// helper to get user by id (mock or db)
async function findUserById(id) {
    if (global.MOCK_DB) {
        global.__mockUsers = global.__mockUsers || [];
        return global.__mockUsers.find(u => u._id == id) || null;
    }
    try {
        // If the id is not a valid ObjectId, avoid calling findById to prevent Mongoose CastError
        if (!mongoose.isValidObjectId(id)) return null;
        return await User.findById(id).lean();
    } catch (err) {
        console.error('findUserById error', err && err.message ? err.message : err);
        return null;
    }
}

router.post('/signup', async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });
    try {
        // ensure mock arrays exist
        if (global.MOCK_DB) global.__mockUsers = global.__mockUsers || [];

        // check existing email
        if (global.MOCK_DB) {
            const existing = global.__mockUsers.find(u => u.email === email);
            if (existing) return res.status(400).json({ error: 'Email already' });
        } else {
            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ error: 'Email already' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // generate username base
        let usernameBase = (displayName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
        let username = usernameBase;
        let suffix = 0;

        if (global.MOCK_DB) {
            while (global.__mockUsers.find(u => u.username === username)) { suffix++; username = `${usernameBase}${suffix}`; }
        } else {
            while (await User.findOne({ username })) { suffix++; username = `${usernameBase}${suffix}`; }
        }

        let user;
        if (global.MOCK_DB) {
            user = { _id: (Date.now() + Math.random()).toString(), email, passwordHash: hash, displayName, username, avatarUrl: null };
            global.__mockUsers.push(user);
        } else {
            user = await User.create({ email, passwordHash: hash, displayName, username });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
        res.status(201).json({ userId: user._id, token });
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    try {
        if (global.MOCK_DB) global.__mockUsers = global.__mockUsers || [];

        if (global.MOCK_DB) {
            const user = global.__mockUsers.find(u => u.email === email);
            if (!user) return res.status(400).json({ error: 'Invalid credentials' });
            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
            return res.json({ token });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
        res.json({ token });
    } catch (err) {
        console.error(err && err.stack ? err.stack : err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

// GET /api/auth/me - return current user profile (requires Authorization header)
router.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        const user = await findUserById(data.userId);
        if (!user) return res.status(404).json({ error: 'Not found' });
        // only expose public fields
        const out = { _id: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl, username: user.username };
        res.json(out);
    } catch (err) { console.error(err); res.status(401).json({ error: 'Unauthorized' }); }
});

