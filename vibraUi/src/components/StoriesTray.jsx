import React, { useState } from 'react'
import axios from 'axios'

export default function StoriesTray({ stories = [], onStoriesUpdated }) {
    const [uploading, setUploading] = useState(false)
    const backend = 'http://localhost:4000'
    const full = (u) => {
        if (!u) return u;
        if (u.startsWith('http://') || u.startsWith('https://')) return encodeURI(u);
        if (u.startsWith('/uploads')) return backend + encodeURI(u);
        const parts = u.split(/[/\\]/);
        const name = parts[parts.length - 1];
        return backend + '/uploads/' + encodeURIComponent(name);
    }
    const addStory = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', file);
        const token = localStorage.getItem('token');
        try {
            const r = await axios.post('http://localhost:4000/api/auth/story', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            onStoriesUpdated && onStoriesUpdated();
        } catch (err) { console.error(err) }
        setUploading(false);
    }

    return (
        <div className="card stories">
            <div className="story">
                <label style={{ cursor: 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => addStory(e.target.files && e.target.files[0])} />
                    <div className="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{uploading ? 'Uploading...' : 'Add'}</div>
                </label>
                <div style={{ fontSize: 12, marginTop: 6 }}>Your story</div>
            </div>
            {stories.length === 0 ? (
                <div className="story"><div className="thumb" /> <div className="muted">No stories</div></div>
            ) : stories.map((s, idx) => (
                <div className="story" key={s._id || idx}>
                    <div className="thumb" style={{ backgroundImage: s.author?.avatarUrl ? `url(${full(s.author.avatarUrl)})` : undefined, backgroundSize: 'cover' }}></div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>{s.author?.displayName || 'User'}</div>
                </div>
            ))}
        </div>
    )
}
