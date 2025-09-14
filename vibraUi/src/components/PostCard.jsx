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

    return (
        <div className="card post">
            <div className="avatar" style={{ backgroundImage: post.author?.avatarUrl ? `url(${post.author.avatarUrl})` : undefined, backgroundSize: 'cover' }} />
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
                {post.media && post.media.length > 0 && <div className="post-media"><img src={post.media[0].url} alt="media" /></div>}
                {allowEdit && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && !editing && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" onClick={() => setEditing(true)}>Edit</button></div>}
                {allowDelete && meId && (meId === String(post.authorId) || meId === String(post.author?._id)) && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button danger" onClick={del}>Delete</button></div>}
            </div>
        </div>
    )
}
