import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

// group: { authorId, stories: [ { url, createdAt, _id, ... } ] }
export default function StoryViewer({ group, onClose, duration = 4000, onDeleted }) {
    const [index, setIndex] = useState(0)
    const timerRef = useRef(null)
    const progressRef = useRef(null)

    useEffect(() => {
        // reset when group changes
        setIndex(0)
        if (progressRef.current) progressRef.current.style.width = '0%'
    }, [group])

    useEffect(() => {
        if (!group || !group.stories || group.stories.length === 0) return;
        // clear any existing timer
        if (timerRef.current) clearTimeout(timerRef.current);
        // animate progress bar over duration
        const start = Date.now();
        progressRef.current && (progressRef.current.style.transition = `width ${duration}ms linear`);
        // ensure reflow so transition applies
        requestAnimationFrame(() => { if (progressRef.current) progressRef.current.style.width = '100%'; });
        timerRef.current = setTimeout(() => {
            // move to next story or close when done
            if (index < group.stories.length - 1) {
                setIndex(i => i + 1)
                // reset progress bar for next
                if (progressRef.current) {
                    progressRef.current.style.transition = 'none'
                    progressRef.current.style.width = '0%'
                }
            } else {
                onClose && onClose()
            }
        }, duration);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); }
    }, [group, index, duration, onClose])

    if (!group || !group.stories || group.stories.length === 0) return null;

    const backend = 'http://localhost:4000'
    const s = group.stories[index]
    const src = (() => {
        if (!s || !s.url) return '';
        if (s.url.startsWith('http://') || s.url.startsWith('https://')) return s.url;
        if (s.url.startsWith('/uploads')) return backend + s.url;
        const parts = s.url.split(/[/\\]/);
        return backend + '/uploads/' + encodeURIComponent(parts[parts.length - 1]);
    })()

    return (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => onClose && onClose()}>
            <div style={{ width: '100%', maxWidth: 700, maxHeight: '90%', padding: 12, boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
                {/* progress bars for each story */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {group.stories.map((st, i) => (
                        <div key={st._id || i} style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
                            <div ref={i === index ? progressRef : null} style={{ height: '100%', width: i < index ? '100%' : '0%', background: 'white', transition: i === index ? `width ${duration}ms linear` : 'none' }} />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <div className="avatar" style={{ width: 48, height: 48, borderRadius: 24, backgroundSize: 'cover', backgroundImage: group.stories[0].author?.avatarUrl ? `url(${group.stories[0].author.avatarUrl})` : undefined }} />
                    <div style={{ color: 'white' }}>
                        <div style={{ fontWeight: 'bold' }}>{group.stories[0].author?.displayName || 'User'}</div>
                        <div style={{ fontSize: 12, opacity: 0.9 }}>{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    {/* delete button shown when the current authenticated user matches the story author */}
                    {(() => {
                        try {
                            const token = localStorage.getItem('token');
                            if (!token) return null;
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            if (!payload || !payload.userId) return null;
                            const me = String(payload.userId);
                            const authorId = String(group.stories[0].author?._id || group.authorId || '');
                            if (me !== authorId) return null;
                            return (
                                <button style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        // identify story by timestamp (ms) if possible
                                        const id = String(new Date(s.createdAt).getTime());
                                        await axios.delete(`http://localhost:4000/api/auth/story/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
                                        onDeleted && onDeleted(s);
                                        onClose && onClose();
                                    } catch (err) { console.error(err); alert('Failed to delete story'); }
                                }}>🗑️</button>
                            )
                        } catch (e) { return null }
                    })()}
                </div>

                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '100%', maxHeight: '70vh', aspectRatio: '9 / 16', overflow: 'hidden', borderRadius: 8 }}>
                        <img src={src} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
