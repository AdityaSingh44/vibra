#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const mongo = process.env.MONGO_URI;
    if (!mongo) {
        console.error('MONGO_URI not set in environment. Aborting.');
        process.exit(2);
    }
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Find posts where media is empty (or missing) and there are legacy media fields
    const query = {
        $and: [
            { $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] },
            { $or: [{ mediaUrls: { $exists: true, $ne: [] } }, { mediaUrl: { $exists: true } }] }
        ]
    };

    const posts = await Post.find(query).lean();
    console.log(`Found ${posts.length} posts to migrate`);
    if (posts.length === 0) {
        await mongoose.disconnect();
        return;
    }

    let updated = 0;
    for (const p of posts) {
        const mediaArray = [];
        if (p.mediaUrl) mediaArray.push({ url: p.mediaUrl });
        if (Array.isArray(p.mediaUrls)) p.mediaUrls.forEach(u => { if (u) mediaArray.push({ url: u }); });
        if (mediaArray.length === 0) continue;
        console.log(`Post ${p._id} -> will set media = [${mediaArray.map(m => m.url).join(', ')}]`);
        if (!dryRun) {
            await Post.updateOne({ _id: p._id }, { $set: { media: mediaArray } }).exec();
            updated++;
        }
    }

    console.log(dryRun ? 'Dry run complete. No changes were written.' : `Migration complete. Updated ${updated} posts.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Migration error', err && err.message ? err.message : err);
    process.exit(1);
});
