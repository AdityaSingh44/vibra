const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
        // compute counts (posts, followers, following)
        let postsCount = 0;
        if (global.MOCK_DB) {
            global.__mockPosts = global.__mockPosts || [];
            postsCount = global.__mockPosts.filter(p => String(p.authorId) === String(user._id) && !p.deleted).length;
        } else {
            postsCount = await Post.countDocuments({ authorId: user._id, deleted: false });
        }
        const followersCount = (user.followers && user.followers.length) || 0;
        const followingCount = (user.following && user.following.length) || 0;
        // only expose public fields
        const out = { _id: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl, username: user.username, bio: user.bio || '', stories: user.stories || [], postsCount, followersCount, followingCount };
        res.json(out);
    } catch (err) { console.error(err); res.status(401).json({ error: 'Unauthorized' }); }
});

// POST /api/auth/follow/:id - follow a user
router.post('/follow/:id', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        const meId = data.userId;
        const otherId = req.params.id;
        if (global.MOCK_DB) {
            const me = global.__mockUsers.find(u => u._id == meId);
            const other = global.__mockUsers.find(u => u._id == otherId);
            if (!me || !other) return res.status(404).json({ error: 'Not found' });
            other.followers = other.followers || [];
            me.following = me.following || [];
            if (!other.followers.includes(meId)) other.followers.push(meId);
            if (!me.following.includes(otherId)) me.following.push(otherId);
            return res.json({ ok: true });
        }
        const me = await User.findById(meId);
        const other = await User.findById(otherId);
        if (!me || !other) return res.status(404).json({ error: 'Not found' });
        other.followers = other.followers || [];
        me.following = me.following || [];
        if (!other.followers.includes(me._id)) other.followers.push(me._id);
        if (!me.following.includes(other._id)) me.following.push(other._id);
        await other.save();
        await me.save();
        res.json({ ok: true });
    } catch (err) { console.error(err); res.status(401).json({ error: 'Unauthorized' }); }
});

// POST /api/auth/unfollow/:id - unfollow a user
router.post('/unfollow/:id', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        const meId = data.userId;
        const otherId = req.params.id;
        if (global.MOCK_DB) {
            const me = global.__mockUsers.find(u => u._id == meId);
            const other = global.__mockUsers.find(u => u._id == otherId);
            if (!me || !other) return res.status(404).json({ error: 'Not found' });
            other.followers = (other.followers || []).filter(x => x != meId);
            me.following = (me.following || []).filter(x => x != otherId);
            return res.json({ ok: true });
        }
        const me = await User.findById(meId);
        const other = await User.findById(otherId);
        if (!me || !other) return res.status(404).json({ error: 'Not found' });
        other.followers = (other.followers || []).filter(x => x.toString() !== me._id.toString());
        me.following = (me.following || []).filter(x => x.toString() !== other._id.toString());
        await other.save();
        await me.save();
        res.json({ ok: true });
    } catch (err) { console.error(err); res.status(401).json({ error: 'Unauthorized' }); }
});

// storage for avatar and story uploads
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, uploadDir), filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname) });
const upload = multer({ storage });

// Middleware to validate JWT token (re-used)
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        req.userId = data.userId;
        next();
    } catch (e) { return res.status(401).json({ error: 'Unauthorized' }); }
}

// PATCH /api/auth/me - update profile (bio, displayName)
router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const { bio, displayName } = req.body;
        if (global.MOCK_DB) {
            const u = global.__mockUsers.find(x => x._id == req.userId);
            if (!u) return res.status(404).json({ error: 'Not found' });
            if (typeof bio !== 'undefined') u.bio = bio;
            if (typeof displayName !== 'undefined') u.displayName = displayName;
            return res.json(u);
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Not found' });
        if (typeof bio !== 'undefined') user.bio = bio;
        if (typeof displayName !== 'undefined') user.displayName = displayName;
        await user.save();
        res.json(user);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/avatar - upload avatar image
router.post('/avatar', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const url = `/uploads/${req.file.filename}`;
        if (global.MOCK_DB) {
            const u = global.__mockUsers.find(x => x._id == req.userId);
            if (!u) return res.status(404).json({ error: 'Not found' });
            u.avatarUrl = url;
            return res.json({ url });
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Not found' });
        user.avatarUrl = url;
        await user.save();
        res.json({ url });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/story - upload a story (image)
router.post('/story', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const url = `/uploads/${req.file.filename}`;
        if (global.MOCK_DB) {
            const u = global.__mockUsers.find(x => x._id == req.userId);
            if (!u) return res.status(404).json({ error: 'Not found' });
            u.stories = u.stories || [];
            const story = { url, createdAt: new Date() };
            u.stories.unshift(story);
            // return the created story with author info for immediate client display
            return res.json({ story: { author: { displayName: u.displayName, avatarUrl: u.avatarUrl, _id: u._id }, url: story.url, createdAt: story.createdAt } });
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Not found' });
        user.stories = user.stories || [];
        const story = { url, createdAt: new Date() };
        user.stories.unshift(story);
        // optionally keep only recent 20
        if (user.stories.length > 20) user.stories = user.stories.slice(0, 20);
        await user.save();
        // return the created story with author info for immediate client display
        res.json({ story: { author: { displayName: user.displayName, avatarUrl: user.avatarUrl, _id: user._id }, url: story.url, createdAt: story.createdAt } });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/auth/story/:id - delete a story owned by the authenticated user
// :id may be a timestamp (ms since epoch) or an ISO date string or the story url
router.delete('/story/:id', authMiddleware, async (req, res) => {
    try {
        const ident = req.params.id;
        if (global.MOCK_DB) {
            const u = global.__mockUsers.find(x => x._id == req.userId);
            if (!u) return res.status(404).json({ error: 'Not found' });
            u.stories = (u.stories || []).filter(s => {
                try {
                    // match by url
                    if (s.url === ident) return false;
                    // match by numeric timestamp (ms)
                    const asNum = Number(ident);
                    if (!Number.isNaN(asNum)) {
                        return Number(new Date(s.createdAt).getTime()) !== asNum;
                    }
                    // match by ISO string
                    if (String(s.createdAt) === ident) return false;
                    return true;
                } catch (e) { return true; }
            });
            return res.json({ ok: true });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Not found' });
        user.stories = (user.stories || []).filter(s => {
            try {
                if (s.url === ident) return false;
                const asNum = Number(ident);
                if (!Number.isNaN(asNum)) {
                    return Number(new Date(s.createdAt).getTime()) !== asNum;
                }
                if (String(s.createdAt) === ident) return false;
                return true;
            } catch (e) { return true; }
        });
        await user.save();
        res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

