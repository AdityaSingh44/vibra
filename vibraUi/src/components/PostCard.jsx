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
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState((post.likes && post.likes.length) || 0)
    const [showComment, setShowComment] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [commentsCount, setCommentsCount] = useState((post.comments && post.comments.length) || 0)
    const [comments, setComments] = useState(post.comments || [])
    const [showLikesList, setShowLikesList] = useState(false)
    const [likesList, setLikesList] = useState([])

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = JSON.parse(atob(token.split('.')[1]));
            const me = payload && payload.userId;
            if (!me) return;
            setLiked((post.likes || []).some(l => String(l) === String(me)));
            setLikesCount((post.likes || []).length);
            setCommentsCount((post.comments || []).length || 0);
        } catch (e) { }
    }, [post.likes])

    // fetch comments when comment panel opens
    useEffect(() => {
        if (!showComment) return;
        let cancelled = false;
        (async () => {
            try {
                const r = await axios.get(`http://localhost:4000/api/posts/${post._id}/comments`);
                if (!cancelled && r && r.data && Array.isArray(r.data.comments)) {
                    setComments(r.data.comments);
                    setCommentsCount((r.data.comments || []).length || 0);
                }
            } catch (err) {
                console.error('Failed to load comments', err);
                if (!cancelled) alert(err.response && err.response.data && err.response.data.error ? err.response.data.error : 'Failed to load comments');
            }
        })();
        return () => { cancelled = true };
    }, [showComment, post._id]);

    // helper: ensure token exists and is probably valid
    const ensureAuth = () => {
        const token = localStorage.getItem('token');
        if (!token) { alert('Please log in to perform this action'); return null; }
        return token;
    }

    return (
        <div className="card post">
            <div className="avatar" style={{ backgroundImage: post.author?.avatarUrl ? `url(${full(post.author.avatarUrl)})` : undefined, backgroundSize: 'cover' }} />
            <div className="post-body">
                <div className="post-meta"><strong>{post.author?.displayName || post.authorId}</strong> · <span style={{ color: '#777' }}>{new Date(post.createdAt).toLocaleString()}</span></div>
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
                {/* action bar (comment / share) below image */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button title="Like" onClick={async () => {
                            const token = ensureAuth(); if (!token) return;
                            // optimistic update
                            const prevLiked = liked; const prevCount = likesCount;
                            setLiked(l => !l); setLikesCount(c => (liked ? c - 1 : c + 1));
                            try {
                                const r = await axios.post(`http://localhost:4000/api/posts/${post._id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } })
                                // update from server response if available
                                if (r && r.data && Array.isArray(r.data.likes)) {
                                    setLikesCount(r.data.likes.length);
                                    try {
                                        const me = JSON.parse(atob(token.split('.')[1])).userId;
                                        setLiked(r.data.likes.some(l => String(l) === String(me)));
                                    } catch (e) { }
                                }
                            } catch (err) {
                                console.error(err);
                                // rollback optimistic
                                setLiked(prevLiked); setLikesCount(prevCount);
                                alert(err.response && err.response.data && err.response.data.error ? err.response.data.error : 'Failed to like post');
                            }
                        }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22 }}>{liked ? '❤️' : '🤍'}</button>
                        <button title="Comment" onClick={() => setShowComment(s => !s)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20 }}>💬</button>
                        <button title="Share" onClick={async () => { try { navigator.clipboard && navigator.clipboard.writeText(window.location.href + `posts/${post._id}`); const token = ensureAuth(); if (!token) return; await axios.post(`http://localhost:4000/api/posts/${post._id}/share`, {}, { headers: { Authorization: `Bearer ${token}` } }); alert('Link copied'); } catch (e) { console.error(e); alert('Could not copy') } }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20 }}>🔗</button>

                        {/* Separate clickable counts */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={async () => {
                                try {
                                    const r = await axios.get(`http://localhost:4000/api/posts/${post._id}/likes`);
                                    if (r && r.data && Array.isArray(r.data.users)) {
                                        setLikesList(r.data.users);
                                        setShowLikesList(true);
                                    }
                                } catch (err) { console.error(err); alert('Failed to load likes') }
                            }}>
                                <span style={{ fontSize: 18 }}>{likesCount}</span>
                                <span style={{ color: '#333' }}>❤</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setShowComment(s => !s)}>
                                <span style={{ fontSize: 18 }}>{commentsCount}</span>
                                <span style={{ color: '#333' }}>💬</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 18 }}>{(post.shares || 0)}</span>
                                <span style={{ color: '#333' }}>🔗</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ color: '#777', fontSize: 13 }}>{/* placeholder for time or other info */}</div>
                </div>

                {showComment && (
                    <div style={{ marginTop: 8 }}>
                        <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." style={{ width: '100%', minHeight: 40 }} />
                        <div style={{ textAlign: 'right', marginTop: 6 }}>
                            <button className="button" onClick={async () => {
                                const token = ensureAuth(); if (!token) return;
                                if (!commentText || commentText.trim() === '') return alert('Comment cannot be empty');
                                // optimistic update: remember previous array and count
                                const prevCommentsArr = comments;
                                const prevCommentsCount = commentsCount;
                                setCommentsCount(c => c + 1);
                                // clear input immediately for responsiveness
                                const textToPost = commentText;
                                setCommentText('');
                                try {
                                    const r = await axios.post(`http://localhost:4000/api/posts/${post._id}/comment`, { text: textToPost }, { headers: { Authorization: `Bearer ${token}` } })
                                    // append newly created comment to local list
                                    if (r && r.data && r.data.comment) {
                                        setComments(prev => [...prev, r.data.comment]);
                                        setShowComment(false);
                                        if (onUpdated) onUpdated({ ...post, comments: [...(post.comments || []), r.data.comment] })
                                    } else {
                                        // fallback: refetch comments
                                        const rr = await axios.get(`http://localhost:4000/api/posts/${post._id}/comments`);
                                        if (rr && rr.data && Array.isArray(rr.data.comments)) setComments(rr.data.comments);
                                        setShowComment(false);
                                    }
                                } catch (err) {
                                    console.error(err);
                                    // rollback
                                    setComments(prevCommentsArr);
                                    setCommentsCount(prevCommentsCount);
                                    alert(err.response && err.response.data && err.response.data.error ? err.response.data.error : 'Failed to add comment')
                                }
                            }}>Post</button>
                        </div>

                        {/* render comments list inline */}
                        <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                            {(comments || []).length === 0 ? <div style={{ color: '#777' }}>No comments yet</div> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {comments.map(c => (
                                        <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#ddd' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{(c.displayName || c.authorDisplayName || c.authorId || 'Unknown')}</div>
                                                <div style={{ fontSize: 14, color: '#222', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                                                <div style={{ fontSize: 12, color: '#888' }}>{new Date(c.createdAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* likes modal/simple panel */}
                {showLikesList && (
                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLikesList(false)}>
                        <div style={{ width: 320, maxHeight: '70%', overflowY: 'auto', background: 'white', borderRadius: 8, padding: 12 }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Likes</div>
                            {(likesList || []).length === 0 ? <div style={{ color: '#777' }}>No likes yet</div> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {likesList.map(u => (
                                        <div key={u._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 18, backgroundImage: u.avatarUrl ? `url(${full(u.avatarUrl)})` : undefined, backgroundSize: 'cover' }} />
                                            <div>{u.displayName || u.username || u._id}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* caption / edit area displayed below image */}
                <div style={{ marginTop: 8 }}>
                    {editing ? (
                        <div>
                            <textarea value={draft} onChange={e => setDraft(e.target.value)} />
                            <div style={{ textAlign: 'right', marginTop: 6 }}>
                                <button className="button" onClick={save}>Save</button>
                                <button className="button" onClick={() => { setEditing(false); setDraft(post.content || '') }} style={{ marginLeft: 8 }}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
                    )}
                </div>
                {allowEdit && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && !editing && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" onClick={() => setEditing(true)}>Edit</button></div>}
                {allowDelete && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button danger" onClick={del}>Delete</button></div>}
            </div>
        </div>
    )
}
