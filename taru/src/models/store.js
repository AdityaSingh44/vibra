const { v4: uuidv4 } = require('uuid');

// Very small in-memory store. Replace with MongoDB adapter in production.
const conversations = new Map(); // id -> conversation
const messages = new Map(); // id -> message

function createConversation(participants = [], type = 'dm') {
    const id = uuidv4();
    const conv = { id, participants, type, lastMessage: null, createdAt: new Date().toISOString() };
    conversations.set(id, conv);
    return conv;
}

function findOrCreate1to1(a, b) {
    for (const conv of conversations.values()) {
        if (conv.type === 'dm' && conv.participants.includes(a) && conv.participants.includes(b)) return conv;
    }
    return createConversation([a, b], 'dm');
}

function listConversationsForUser(userId) {
    return Array.from(conversations.values()).filter(c => c.participants.includes(userId));
}

function createMessage(conversationId, senderId, body) {
    const id = uuidv4();
    const msg = { id, conversationId, senderId, body, status: 'sent', createdAt: new Date().toISOString() };
    messages.set(id, msg);
    const conv = conversations.get(conversationId);
    if (conv) conv.lastMessage = { id, senderId, text: body.text, createdAt: msg.createdAt };
    return msg;
}

function listMessages(conversationId, limit = 50) {
    return Array.from(messages.values())
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
}

module.exports = {
    createConversation,
    findOrCreate1to1,
    listConversationsForUser,
    createMessage,
    listMessages,
    // expose raw maps for debugging
    __conversations: conversations,
    __messages: messages,
};
