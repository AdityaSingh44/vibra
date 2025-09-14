import React, { useState } from 'react'
import axios from 'axios'

export default function Compose({ onPosted }) {
    const [content, setContent] = useState('')
    const [err, setErr] = useState('')
    const submit = async e => {
        e.preventDefault();
        setErr('')
        if (!content || content.trim() === '') { setErr('Post cannot be empty'); return }
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:4000/api/posts', { content }, { headers: { Authorization: `Bearer ${token}` } });
            setContent('');
            onPosted && onPosted();
        } catch (err) { console.error(err); setErr(err.response?.data?.error || 'Failed') }
    }
    return (
        <div className="card compose">
            <form onSubmit={submit}>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's happening?" />
                <div style={{ color: 'red', marginBottom: 6 }}>{err}</div>
                <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" disabled={!content || content.trim() === ''}>Post</button></div>
            </form>
        </div>
    )
}