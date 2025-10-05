const mongoose = require('mongoose')

const ConversationSchema = new mongoose.Schema({
    participants: [{ type: String, required: true }],
    type: { type: String, enum: ['dm', 'group'], default: 'dm' },
    lastMessage: { id: String, senderId: String, text: String, createdAt: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

ConversationSchema.index({ participants: 1 })

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema)
