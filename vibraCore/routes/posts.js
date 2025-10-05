const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');
const mongoose = require('mongoose');

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
        // If the app is running with a real MongoDB (not MOCK_DB), ensure the token's userId
        // is a valid MongoDB ObjectId; otherwise we may try to write an invalid authorId
        // into the Post model which will throw a CastError. When MOCK_DB is enabled we
        // allow legacy / generated non-ObjectId ids.
        if (!global.MOCK_DB && mongoose.connection && mongoose.connection.readyState === 1) {
            if (!data || !data.userId || !mongoose.Types.ObjectId.isValid(String(data.userId))) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        }
        req.userId = data.userId;
        next();
    } catch (e) { return res.status(401).json({ error: 'Unauthorized' }); }
}

router.post('/', authMiddleware, async (req, res) => {
    const { content, mediaUrl, mediaUrls } = req.body;
    // normalize media into array of { url }
    const mediaArray = [];
    if (mediaUrl) mediaArray.push({ url: mediaUrl });
    if (Array.isArray(mediaUrls)) mediaUrls.forEach(u => { if (u) mediaArray.push({ url: u }); });
    // validate: must have content or media
    if ((!content || content.trim() === '') && mediaArray.length === 0) return res.status(400).json({ error: 'Empty post not allowed' });
    try {
        if (global.MOCK_DB) {
            const post = { _id: (Date.now() + Math.random()).toString(), authorId: req.userId, content, media: mediaArray, createdAt: new Date(), deleted: false };
            global.__mockPosts.unshift(post);
            return res.status(201).json(post);
        }
        const post = await Post.create({ authorId: req.userId, content, media: mediaArray });
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
        // validate id before querying DB to avoid Mongoose CastError
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
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
        const { content, mediaUrl, mediaUrls } = req.body;
        const mediaArray = [];
        if (mediaUrl) mediaArray.push({ url: mediaUrl });
        if (Array.isArray(mediaUrls)) mediaUrls.forEach(u => { if (u) mediaArray.push({ url: u }); });
        if ((!content || content.trim() === '') && mediaArray.length === 0) return res.status(400).json({ error: 'Empty post not allowed' });

        if (global.MOCK_DB) {
            const idx = global.__mockPosts.findIndex(p => p._id === id);
            if (idx === -1) return res.status(404).json({ error: 'Not found' });
            const post = global.__mockPosts[idx];
            if (post.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
            post.content = content;
            if (mediaArray.length) post.media = mediaArray;
            post.updatedAt = new Date();
            global.__mockPosts[idx] = post;
            return res.json(post);
        }

        // validate id to prevent Mongoose CastError
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        if (post.authorId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
        post.content = content;
        if (mediaArray.length) post.media = mediaArray;
        post.updatedAt = new Date();
        await post.save();
        res.json(post);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/posts/:id/like - toggle like by current user
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const p = global.__mockPosts.find(x => x._id === id);
            if (!p) return res.status(404).json({ error: 'Not found' });
            p.likes = p.likes || [];
            const idx = p.likes.indexOf(req.userId);
            if (idx === -1) p.likes.push(req.userId); else p.likes.splice(idx, 1);
            return res.json({ likes: p.likes });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        post.likes = post.likes || [];
        // ensure the token's userId is a valid ObjectId before casting
        if (!req.userId || !mongoose.Types.ObjectId.isValid(String(req.userId))) return res.status(401).json({ error: 'Unauthorized' });
        const meId = String(req.userId);
        // likes may be stored as ObjectId instances; compare by string
        const found = post.likes.find(l => String(l) === meId);
        if (found) post.likes = post.likes.filter(l => String(l) !== meId); else post.likes.push(new mongoose.Types.ObjectId(meId));
        await post.save();
        res.json({ likes: post.likes });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/posts/:id/comment - add a comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { text } = req.body;
        if (!text || text.trim() === '') return res.status(400).json({ error: 'Empty comment' });
        if (global.MOCK_DB) {
            const p = global.__mockPosts.find(x => x._id === id);
            if (!p) return res.status(404).json({ error: 'Not found' });
            p.comments = p.comments || [];
            const c = { authorId: req.userId, text, createdAt: new Date() };
            p.comments.push(c);
            // attach displayName/avatar from mock users for convenience
            const u = (global.__mockUsers || []).find(x => x._id == req.userId);
            const reply = { ...c, displayName: u ? u.displayName : undefined, avatarUrl: u ? u.avatarUrl : undefined };
            return res.json({ comment: reply });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        // validate user id
        if (!req.userId || !mongoose.Types.ObjectId.isValid(String(req.userId))) return res.status(401).json({ error: 'Unauthorized' });
        post.comments = post.comments || [];
        post.comments.push({ authorId: new mongoose.Types.ObjectId(String(req.userId)), text, createdAt: new Date() });
        await post.save();
        const added = post.comments[post.comments.length - 1];
        // fetch author info to attach displayName/avatar
        try {
            const user = await User.findById(String(req.userId)).select('displayName avatarUrl username').lean();
            const addedObj = (added && added.toObject) ? added.toObject() : added;
            const reply = { ...addedObj, displayName: user ? user.displayName : undefined, avatarUrl: user ? user.avatarUrl : undefined };
            return res.json({ comment: reply });
        } catch (e) {
            const addedObj = (added && added.toObject) ? added.toObject() : added;
            return res.json({ comment: addedObj });
        }
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/posts/:id/share - increment share count for analytics
router.post('/:id/share', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const p = global.__mockPosts.find(x => x._id === id);
            if (!p) return res.status(404).json({ error: 'Not found' });
            p.shares = (p.shares || 0) + 1;
            return res.json({ shares: p.shares });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        post.shares = (post.shares || 0) + 1;
        await post.save();
        res.json({ shares: post.shares });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts/:id/likes - list users who liked the post (basic info)
router.get('/:id/likes', async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const p = global.__mockPosts.find(x => x._id === id);
            if (!p) return res.status(404).json({ error: 'Not found' });
            const users = (p.likes || []).map(uid => {
                const u = global.__mockUsers.find(x => x._id == uid);
                return u ? { _id: u._id, displayName: u.displayName, avatarUrl: u.avatarUrl } : { _id: uid };
            });
            return res.json({ users });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id).populate('likes', 'displayName avatarUrl username').lean();
        if (!post) return res.status(404).json({ error: 'Not found' });
        res.json({ users: (post.likes || []).map(u => ({ _id: u._id, displayName: u.displayName, avatarUrl: u.avatarUrl })) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Accept single file under 'file' OR multiple files under 'files[]' or 'files'
router.post('/media', authMiddleware, upload.any(), async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) return res.status(400).json({ error: 'No file' });
        const urls = files.map(f => `/uploads/${f.filename}`);
        // return array of urls for client convenience
        return res.json({ urls });
    } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts/stories - list recent stories across users
router.get('/stories', async (req, res) => {
    try {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        if (global.MOCK_DB) {
            const users = global.__mockUsers || [];
            const stories = [];
            users.forEach(u => {
                (u.stories || []).forEach(s => { const time = new Date(s.createdAt).getTime(); if (time >= cutoff) stories.push({ author: { displayName: u.displayName, avatarUrl: u.avatarUrl, _id: u._id }, url: s.url, createdAt: s.createdAt }); });
            });
            stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return res.json(stories.slice(0, 50));
        }
        // for DB-backed users, fetch users with non-empty stories and filter by createdAt
        const users = await User.find({ 'stories.0': { $exists: true } }).select('displayName avatarUrl stories').lean();
        const stories = [];
        users.forEach(u => { (u.stories || []).forEach(s => { const time = new Date(s.createdAt).getTime(); if (time >= cutoff) stories.push({ author: { displayName: u.displayName, avatarUrl: u.avatarUrl, _id: u._id }, url: s.url, createdAt: s.createdAt }); }); });
        stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(stories.slice(0, 50));
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts/:id - get single post
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const post = global.__mockPosts.find(p => p._id === id);
            if (!post) return res.status(404).json({ error: 'Not found' });
            return res.json(post);
        }
        // validate ObjectId to avoid Mongoose CastError when a non-id string (eg 'stories') hits this route
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ error: 'Not found' });
        res.json(post);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/posts/:id/comments - list comments for a post (most recent last)
router.get('/:id/comments', async (req, res) => {
    try {
        const id = req.params.id;
        if (global.MOCK_DB) {
            const p = global.__mockPosts.find(x => x._id === id);
            if (!p) return res.status(404).json({ error: 'Not found' });
            // attach displayName/avatar for mock users
            const comments = (p.comments || []).map(c => {
                const u = (global.__mockUsers || []).find(x => x._id == c.authorId);
                return { ...c, displayName: u ? u.displayName : undefined, avatarUrl: u ? u.avatarUrl : undefined };
            });
            return res.json({ comments });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
        const post = await Post.findById(id).lean();
        if (!post) return res.status(404).json({ error: 'Not found' });
        const comments = post.comments || [];
        // resolve author info for comment authorIds
        const authorIds = [...new Set(comments.map(c => String(c.authorId)))].filter(x => !!x);
        const users = authorIds.length ? await User.find({ _id: { $in: authorIds } }).select('displayName avatarUrl username').lean() : [];
        const userMap = Object.fromEntries((users || []).map(u => [String(u._id), u]));
        const out = comments.map(c => ({ ...c, displayName: userMap[String(c.authorId)] ? userMap[String(c.authorId)].displayName : undefined, avatarUrl: userMap[String(c.authorId)] ? userMap[String(c.authorId)].avatarUrl : undefined }));
        res.json({ comments: out });
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
