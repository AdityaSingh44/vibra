import React, { useState } from 'react'
import { uploadPostMedia, createPost } from '../api'

export default function Compose({ onPosted }) {
    const [content, setContent] = useState('')
    const [err, setErr] = useState('')
    const [files, setFiles] = useState([])
    const [index, setIndex] = useState(0)
    const onSelect = e => {
        const list = Array.from(e.target.files || [])
        setFiles(list)
        setIndex(0)
    }

    const submit = async e => {
        e.preventDefault();
        setErr('')
        if ((!content || content.trim() === '') && files.length === 0) { setErr('Post cannot be empty'); return }
        try {
            const token = localStorage.getItem('token');
            let mediaUrls = [];
            if (files.length > 0) {
                const r = await uploadPostMedia(files, token);
                // server returns { urls: [...] }
                console.debug('uploadPostMedia response', r);
                mediaUrls = r.urls || [];
            }
            const created = await createPost(content, mediaUrls, token);
            console.debug('createPost response', created);
            setContent('');
            setFiles([])
            setIndex(0)
            onPosted && onPosted();
        } catch (err) { console.error(err); setErr(err.response?.data?.error || 'Failed') }
    }

    return (
        <div className="card compose">
            <form onSubmit={submit}>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write a caption..." />

                <div style={{ marginTop: 8 }}>
                    <input type="file" accept="image/*" multiple onChange={onSelect} />
                </div>

                {files.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button type="button" className="button" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>Prev</button>
                            <div style={{ flex: 1, textAlign: 'center' }}>{index + 1} / {files.length}</div>
                            <button type="button" className="button" onClick={() => setIndex(i => Math.min(files.length - 1, i + 1))} disabled={index === files.length - 1}>Next</button>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <img src={URL.createObjectURL(files[index])} alt="preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
                        </div>
                    </div>
                )}

                <div style={{ color: 'red', marginBottom: 6 }}>{err}</div>
                <div style={{ textAlign: 'right', marginTop: 8 }}><button className="button" disabled={(!content || content.trim() === '') && files.length === 0}>Post</button></div>
            </form>
        </div>
    )
}