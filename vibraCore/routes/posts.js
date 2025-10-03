const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage });

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

router.post('/', authMiddleware, async (req, res) => {
    const { content, mediaUrl } = req.body;
    // validate: must have content or media
    if ((!content || content.trim() === '') && !mediaUrl) return res.status(400).json({ error: 'Empty post not allowed' });
    try {
        if (global.MOCK_DB) {
            const post = { _id: (Date.now() + Math.random()).toString(), authorId: req.userId, content, media: mediaUrl ? [{ url: mediaUrl }] : [], createdAt: new Date(), deleted: false };
            global.__mockPosts.unshift(post);
            return res.status(201).json(post);
        }
        const post = await Post.create({ authorId: req.userId, content, media: mediaUrl ? [{ url: mediaUrl }] : [] });
        res.status(201).json(post);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/posts/:id - only author can delete (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const idx = global.__mockPosts.findIndex(p => p._id === id);
            if (idx === -1) return res.status(404).json({ error: 'Not found' });
            const post = global.__mockPosts[idx];
            if (post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
            // remove from array
            global.__mockPosts.splice(idx, 1);
            return res.json({ ok: true });
        }
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        if (post.authorId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
        post.deleted = true;
        await post.save();
        res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/posts/:id - update post (only author)
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { content, mediaUrl } = req.body;
        if ((!content || content.trim() === '') && !mediaUrl) return res.status(400).json({ error: 'Empty post not allowed' });

        if (global.MOCK_DB) {
            const idx = global.__mockPosts.findIndex(p => p._id === id);
            if (idx === -1) return res.status(404).json({ error: 'Not found' });
            const post = global.__mockPosts[idx];
            if (post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
            post.content = content;
            if (mediaUrl) post.media = [{ url: mediaUrl }];
            post.updatedAt = new Date();
            global.__mockPosts[idx] = post;
            return res.json(post);
        }

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        if (post.authorId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
        post.content = content;
        if (mediaUrl) post.media = [{ url: mediaUrl }];
        post.updatedAt = new Date();
        await post.save();
        res.json(post);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/media', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

router.get('/:id', async (req, res) => {
    try {
        if (global.MOCK_DB) {
            const post = global.__mockPosts.find(p => p._id === req.params.id);
            if (!post) return res.status(404).json({ error: 'Not found' });
            return res.json(post);
        }
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        res.json(post);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts/stories - list recent stories across users
router.get('/stories', async (req, res) => {
    try {
        if (global.MOCK_DB) {
            const users = global.__mockUsers || [];
            const stories = [];
            users.forEach(u => {
                (u.stories || []).forEach(s => stories.push({ author: { displayName: u.displayName, avatarUrl: u.avatarUrl, _id: u._id }, url: s.url, createdAt: s.createdAt }));
            });
            stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(stories.slice(0, 50));
        }
        // for DB-backed users, fetch users with non-empty stories
        const users = await User.find({ 'stories.0': { $exists: true } }).select('displayName avatarUrl stories').lean();
        const stories = [];
        users.forEach(u => { (u.stories || []).forEach(s => stories.push({ author: { displayName: u.displayName, avatarUrl: u.avatarUrl, _id: u._id }, url: s.url, createdAt: s.createdAt })); });
        stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(stories.slice(0, 50));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts - list recent posts with author info
router.get('/', async (req, res) => {
    try {
        const { authorId } = req.query;
        if (global.MOCK_DB) {
            let posts = global.__mockPosts.filter(p => !p.deleted && ((p.content && p.content.trim() !== '') || (p.media && p.media.length > 0)));
            if (authorId) posts = posts.filter(p => String(p.authorId) === String(authorId));
            posts = posts.slice(0, 50);
            // attach author info
            const authorIds = [...new Set(posts.map(p => p.authorId))];
            const users = global.__mockUsers.filter(u => authorIds.includes(u._id));
            const userMap = users.reduce((acc, u) => { acc[u._id] = u; return acc; }, {});
            const out = posts.map(p => ({ ...p, author: { displayName: userMap[p.authorId]?.displayName || 'Unknown', avatarUrl: userMap[p.authorId]?.avatarUrl || null } }));
            return res.json(out);
        }
        let postsQuery = { deleted: false };
        if (req.query.authorId) postsQuery.authorId = req.query.authorId;
        const posts = (await Post.find(postsQuery).sort({ createdAt: -1 }).limit(50).lean()).filter(p => (p.content && p.content.trim() !== '') || (p.media && p.media.length > 0));
        // populate author displayName and avatarUrl
        const userIds = [...new Set(posts.map(p => p.authorId.toString()))];
        const users = await User.find({ _id: { $in: userIds } }).select('displayName avatarUrl username').lean();
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
        const out = posts.map(p => ({ ...p, author: userMap[p.authorId.toString()] || null }));
        res.json(out);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
