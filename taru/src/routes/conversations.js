const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')

// Lightweight auth-like middleware for the scaffold: accept x-user-id header or ?userId
router.use((req, res, next) => {
    const userId = req.header('x-user-id') || req.query.userId || null;
    req.userId = userId;
    next();
});

// Middleware: simple auth simulation via header `x-user-id` for the scaffold
router.use((req, res, next) => {
    const userId = req.header('x-user-id') || req.query.userId || 'user-1';
    req.userId = userId;
    next();
});

// GET /conversations
router.get('/', async (req, res) => {
    try {
        if (!req.userId) return res.status(400).json({ error: 'Missing x-user-id header or userId query' })
        const list = await Conversation.find({ participants: req.userId }).lean().exec()
        res.json({ conversations: list })
    } catch (err) { res.status(500).json({ error: err.message }) }
});

// POST /conversations (create or find 1:1)
router.post('/', async (req, res) => {
    const { participants = [], type = 'dm' } = req.body;
    try {
        // sanitize participants: replace falsy entries with req.userId when available
        const sanitized = (Array.isArray(participants) ? participants : []).map(p => (p ? p : req.userId)).filter(Boolean)
        if (sanitized.length === 0) return res.status(400).json({ error: 'participants required' })

        if (type === 'dm') {
            if (sanitized.length !== 2) return res.status(400).json({ error: 'dm must have exactly 2 participants' })
            // find existing 1:1
            const existing = await Conversation.findOne({ type: 'dm', participants: { $all: sanitized, $size: 2 } }).lean().exec()
            if (existing) return res.status(200).json(existing)
            const conv = await Conversation.create({ participants: sanitized, type })
            return res.status(201).json(conv)
        }

        const conv = await Conversation.create({ participants: sanitized, type })
        res.status(201).json(conv)
    } catch (err) { res.status(500).json({ error: err.message }) }
});

// GET /conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
    try {
        const convId = req.params.id;
        const msgs = await Message.find({ conversationId: convId }).sort({ createdAt: 1 }).lean().exec()
        res.json({ messages: msgs })
    } catch (err) { res.status(500).json({ error: err.message }) }
});

// POST /conversations/:id/messages -> create message via HTTP
router.post('/:id/messages', async (req, res) => {
    try {
        const convId = req.params.id;
        const { body } = req.body;
        if (!body) return res.status(400).json({ error: 'Missing body' });
        const msg = await Message.create({ conversationId: convId, senderId: req.userId, body })
        // update conversation lastMessage
        await Conversation.findByIdAndUpdate(convId, { lastMessage: { id: msg._id, senderId: msg.senderId, text: body.text, createdAt: msg.createdAt }, updatedAt: new Date() })
        // In production: publish to Redis
        res.status(201).json(msg)
    } catch (err) { res.status(500).json({ error: err.message }) }
});

module.exports = router;
