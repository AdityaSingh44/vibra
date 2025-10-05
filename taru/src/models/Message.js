const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: String, required: true },
    body: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    createdAt: { type: Date, default: Date.now }
})

MessageSchema.index({ conversationId: 1, createdAt: -1 })

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema)
