import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/PostCard'

export default function Profile() {
    const [me, setMe] = useState(null)
    const navigate = useNavigate()
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return
        axios.get('http://localhost:4000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setMe(r.data)).catch(() => setMe(null))
    }, [])

    const [posts, setPosts] = useState([])
    useEffect(() => {
        if (!me) return
        axios.get(`http://localhost:4000/api/posts?authorId=${me._id}`).then(r => setPosts(r.data)).catch(() => setPosts([]))
    }, [me])

    if (!me) return <div style={{ padding: 20 }}>Not logged in. <a href="/login">Login</a></div>
    return (
        <div className="container" style={{ paddingTop: 20 }}>
            <div style={{ marginBottom: 12 }}>
                <button className="button" onClick={() => navigate('/')}>Back to home</button>
            </div>
            <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    {(() => {
                        const backend = 'http://localhost:4000'; let avatar = me.avatarUrl;
                        if (avatar) {
                            if (avatar.startsWith('/uploads')) avatar = backend + encodeURI(avatar);
                            else if (!avatar.startsWith('http')) { const parts = avatar.split(/[/\\]/); avatar = backend + '/uploads/' + encodeURIComponent(parts[parts.length - 1]); }
                            else avatar = encodeURI(avatar);
                        }
                        return <div className="avatar" style={{ width: 96, height: 96, borderRadius: 48, backgroundImage: avatar ? `url(${avatar})` : undefined, backgroundSize: 'cover' }} />
                    })()}
                    <label style={{ position: 'absolute', right: -6, bottom: -6 }}>
                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={async e => {
                            const f = e.target.files && e.target.files[0]; if (!f) return;
                            const fd = new FormData(); fd.append('file', f);
                            const token = localStorage.getItem('token');
                            try {
                                const r = await axios.post('http://localhost:4000/api/auth/avatar', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); setMe({ ...me, avatarUrl: r.data.url });
                                // notify other UI (navbar) that profile changed
                                try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatarUrl: r.data.url } })); } catch (e) { /* ignore */ }
                            } catch (err) { console.error(err) }
                        }} />
                        <div className="button">Change</div>
                    </label>
                </div>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{me.displayName}</h2>
                    <div style={{ color: '#666' }}>@{me.username}</div>
                </div>
            </div>
            <div style={{ marginTop: 16 }} className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>About <small style={{ color: '#666' }}>Editable</small></h3>
                <EditableBio initial={me.bio || ''} onSave={async (newBio) => {
                    const token = localStorage.getItem('token');
                    try {
                        await axios.patch('http://localhost:4000/api/auth/me', { bio: newBio }, { headers: { Authorization: `Bearer ${token}` } }); setMe({ ...me, bio: newBio });
                        try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { bio: newBio } })); } catch (e) { }
                    } catch (err) { console.error(err) }
                }} />
            </div>
            <div style={{ marginTop: 16 }}>
                <h3>Your posts</h3>
                {posts.map(p => <PostCard key={p._id} post={p} allowDelete={true} allowEdit={true} onDeleted={() => setPosts(posts.filter(x => x._id !== p._id))} onUpdated={(updated) => setPosts(posts.map(x => x._id === updated._id ? updated : x))} />)}
            </div>
        </div>
    )
}

function EditableBio({ initial = '', onSave }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(initial);
    useEffect(() => setValue(initial), [initial]);
    return (
        <div>
            {!editing ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, color: '#333' }}>{value || <span style={{ color: '#888' }}>No bio</span>}</div>
                    <div><button className="button" onClick={() => setEditing(true)}>Edit</button></div>
                </div>
            ) : (
                <div>
                    <textarea value={value} onChange={e => setValue(e.target.value)} />
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <button className="button" onClick={async () => { await onSave(value); setEditing(false); }}>Save</button>
                        <button className="button" onClick={() => { setValue(initial); setEditing(false); }} style={{ marginLeft: 8 }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    )
}
