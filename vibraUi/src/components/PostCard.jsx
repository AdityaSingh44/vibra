import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function PostCard({ post, onDeleted, allowDelete = false, allowEdit = false, onUpdated }) {
    const [meId, setMeId] = useState(null)
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return
        // decode token payload quickly (not secure, just for id)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setMeId(payload.userId)
        } catch (e) { }
    }, [])

    const del = async () => {
        const token = localStorage.getItem('token')
        try {
            await axios.delete(`http://localhost:4000/api/posts/${post._id}`, { headers: { Authorization: `Bearer ${token}` } })
            onDeleted && onDeleted()
        } catch (err) { console.error(err) }
    }

    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(post.content || '')
    const save = async () => {
        const token = localStorage.getItem('token')
        try {
            const r = await axios.patch(`http://localhost:4000/api/posts/${post._id}`, { content: draft }, { headers: { Authorization: `Bearer ${token}` } })
            setEditing(false)
            onUpdated && onUpdated(r.data)
        } catch (err) { console.error(err) }
    }

    const backend = 'http://localhost:4000';
    const full = (u) => {
        if (!u) return u;
        try {
            // already a full http url
            if (String(u).startsWith('http://') || String(u).startsWith('https://')) return String(u);
            // relative upload path (server returns '/uploads/filename')
            if (String(u).startsWith('/uploads')) return backend + String(u);
            // sometimes the server or legacy code stores just the filename or a windows path
            // extract the filename portion and build uploads path
            const parts = String(u).split(/[/\\]/);
            const name = parts[parts.length - 1];
            if (!name) return String(u);
            return backend + '/uploads/' + encodeURIComponent(name);
        } catch (e) {
            console.warn('full() failed for', u, e);
            return u;
        }
    };

    // media entries in DB may be either strings (legacy) or objects { url }
    const rawMediaUrl = (m) => {
        if (!m) return null;
        if (typeof m === 'string') return m;
        if (m.url) return m.url;
        // fallback: try to stringify or use as-is
        return String(m);
    };

    // normalize various possible shapes: post.media (preferred), or legacy mediaUrls / mediaUrl
    const getMediaArray = (post) => {
        if (!post) return [];
        if (Array.isArray(post.media) && post.media.length > 0) return post.media;
        if (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) return post.mediaUrls.map(u => (typeof u === 'string' ? { url: u } : u));
        if (post.mediaUrl) return [{ url: post.mediaUrl }];
        return [];
    };

    const [idx, setIdx] = useState(0)

    return (
        <div className="card post">
            <div className="avatar" style={{ backgroundImage: post.author?.avatarUrl ? `url(${full(post.author.avatarUrl)})` : undefined, backgroundSize: 'cover' }} />
            <div className="post-body">
                <div className="post-meta"><strong>{post.author?.displayName || post.authorId}</strong> · <span style={{ color: '#777' }}>{new Date(post.createdAt).toLocaleString()}</span></div>
                <div>{editing ? (
                    <div>
                        <textarea value={draft} onChange={e => setDraft(e.target.value)} />
                        <div style={{ textAlign: 'right', marginTop: 6 }}>
                            <button className="button" onClick={save}>Save</button>
                            <button className="button" onClick={() => { setEditing(false); setDraft(post.content || '') }} style={{ marginLeft: 8 }}>Cancel</button>
                        </div>
                    </div>
                ) : post.content}</div>
                {(() => {
                    const mediaArr = getMediaArray(post);
                    if (!mediaArr || mediaArr.length === 0) return null;
                    return (
                        <div className="post-media" style={{ position: 'relative' }}>
                            {/* fixed aspect ratio container for consistent post image size */}
                            <div style={{ width: '100%', paddingTop: '66.6667%', position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#f5f5f5' }}>
                                <img src={full(rawMediaUrl(mediaArr[idx]))} alt={`media-${idx}`} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                                    // try a safer fallback: if src was something like '/uploads/name' or 'C:\\...\\name'
                                    try {
                                        const img = e.target;
                                        const src = img.getAttribute('src') || '';
                                        // if it's already absolute http(s) we can't do much
                                        if (src.startsWith('http://') || src.startsWith('https://')) return;
                                        // build fallback from last path segment
                                        const parts = String(src).split(/[/\\]/);
                                        const fname = parts[parts.length - 1];
                                        if (!fname) return;
                                        const fallback = backend + '/uploads/' + encodeURIComponent(fname);
                                        if (fallback === src) return;
                                        img.src = fallback;
                                    } catch (err) {
                                        console.error('img onError fallback failed', err);
                                    }
                                }} />
                            </div>
                            {mediaArr.length > 1 && (
                                <>
                                    <button type="button" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>◀</button>
                                    <button type="button" onClick={() => setIdx(i => Math.min(mediaArr.length - 1, i + 1))} disabled={idx === mediaArr.length - 1} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▶</button>
                                    <div style={{ position: 'absolute', right: 12, bottom: 8, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{idx + 1} / {mediaArr.length}</div>
                                </>
                            )}
                        </div>
                    )
                })()}
                {allowEdit && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && !editing && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" onClick={() => setEditing(true)}>Edit</button></div>}
                {allowDelete && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button danger" onClick={del}>Delete</button></div>}
            </div>
        </div>
    )
}
