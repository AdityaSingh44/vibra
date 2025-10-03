import React, { useState } from 'react'
import axios from 'axios'

export default function Compose({ onPosted }) {
    const [content, setContent] = useState('')
    const [err, setErr] = useState('')
    const [file, setFile] = useState(null)
    const submit = async e => {
        e.preventDefault();
        setErr('')
        if ((!content || content.trim() === '') && !file) { setErr('Post cannot be empty'); return }
        try {
            const token = localStorage.getItem('token');
            let mediaUrl = null;
            if (file) {
                const fd = new FormData(); fd.append('file', file);
                const r = await axios.post('http://localhost:4000/api/posts/media', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
                mediaUrl = r.data.url;
            }
            await axios.post('http://localhost:4000/api/posts', { content, mediaUrl }, { headers: { Authorization: `Bearer ${token}` } });
            setContent('');
            setFile(null)
            onPosted && onPosted();
        } catch (err) { console.error(err); setErr(err.response?.data?.error || 'Failed') }
    }
    return (
        <div className="card compose">
            <form onSubmit={submit}>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's happening?" />
                <div style={{ marginTop: 8 }}>
                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files && e.target.files[0])} />
                </div>
                <div style={{ color: 'red', marginBottom: 6 }}>{err}</div>
                <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" disabled={(!content || content.trim() === '') && !file}>Post</button></div>
            </form>
        </div>
    )
}