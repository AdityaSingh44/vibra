const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    // store media as array of objects with explicit keys; avoid using 'type' as it is special in Mongoose schemas
    media: [{ url: String, mediaType: String }],
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    createdAt: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Post', PostSchema);
