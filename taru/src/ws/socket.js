const { Server } = require('socket.io');
const Message = require('../models/Message')
const Conversation = require('../models/Conversation')

function setupSocket(server) {
    const io = new Server(server, { path: '/socket', cors: { origin: '*' } });

    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId || socket.handshake.headers['x-user-id'] || 'user-1';
        socket.data.userId = userId;
        console.log('socket connected userId=', userId);

        socket.on('subscribe', (payload) => {
            const { conversationId } = payload || {};
            if (!conversationId) return;
            const room = `conversation:${conversationId}`;
            socket.join(room);
            socket.emit('subscribed', { conversationId });
        });

        socket.on('send_message', async (payload, ack) => {
            const { conversationId, body, clientTempId } = payload || {};
            if (!conversationId || !body) {
                if (ack) ack({ ok: false, error: 'invalid_payload' });
                return;
            }
            try {
                const msg = await Message.create({ conversationId, senderId: socket.data.userId, body })
                // update conversation lastMessage
                await Conversation.findByIdAndUpdate(conversationId, { lastMessage: { id: msg._id, senderId: msg.senderId, text: body.text, createdAt: msg.createdAt }, updatedAt: new Date() })
                const room = `conversation:${conversationId}`;
                io.to(room).emit('message', { ...msg.toObject(), id: String(msg._id) });
                if (ack) ack({ ok: true, messageId: String(msg._id) });
            } catch (err) {
                if (ack) ack({ ok: false, error: err.message })
            }
        });

        socket.on('message_status', async (payload) => {
            // payload: { messageId, status }
            const { messageId, status } = payload || {};
            if (!messageId || !status) return;
            try {
                const msg = await Message.findByIdAndUpdate(messageId, { status }, { new: true }).lean().exec()
                if (msg) {
                    const room = `conversation:${msg.conversationId}`;
                    io.to(room).emit('message_status', { messageId, status });
                }
            } catch (err) { console.warn('message_status failed', err.message) }
        });

        socket.on('disconnect', () => {
            console.log('socket disconnected', socket.id, 'userId=', userId);
        });
    });
}

module.exports = { setupSocket };
