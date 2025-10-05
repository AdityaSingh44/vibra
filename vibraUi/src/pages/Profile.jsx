import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/PostCard'
import meStore, { loadMe } from '../stores/meStore'
import { uploadAvatar, getPosts } from '../api'

export default function Profile() {
    const [me, setMe] = useState(null)
    const navigate = useNavigate()
    useEffect(() => {
        const unsub = meStore.subscribe(setMe)
        loadMe()
        return unsub
    }, [])

    const [posts, setPosts] = useState([])
    useEffect(() => {
        if (!me) return
        getPosts(me._id).then(r => setPosts(r)).catch(() => setPosts([]))
    }, [me])

    if (!me) return <div style={{ padding: 20 }}>Not logged in. <a href="/login">Login</a></div>
    return (
        <div className="container" style={{ paddingTop: 20 }}>
            <div style={{ marginBottom: 12 }}>
                <button className="button" onClick={() => navigate('/')}>Back to home</button>
            </div>

            <div className="card profile-header">
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        {(() => {
                            const backend = 'http://localhost:4000';
                            let avatar = me.avatarUrl;
                            if (avatar) {
                                if (avatar.startsWith('/uploads')) avatar = backend + encodeURI(avatar);
                                else if (!avatar.startsWith('http')) { const parts = avatar.split(/[/\\]/); avatar = backend + '/uploads/' + encodeURIComponent(parts[parts.length - 1]); }
                                else avatar = encodeURI(avatar);
                            }
                            return <div className="avatar large" style={{ backgroundImage: avatar ? `url(${avatar})` : undefined, backgroundSize: 'cover' }} />
                        })()}
                        <label className="avatar-change">
                            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={async e => {
                                const f = e.target.files && e.target.files[0]; if (!f) return;
                                const token = localStorage.getItem('token');
                                try {
                                    const r = await uploadAvatar(f, token);
                                    meStore.setMe({ ...(me || {}), avatarUrl: r.url })
                                    try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatarUrl: r.url } })); } catch (e) { }
                                } catch (err) { console.error(err) }
                            }} />
                            <div className="small-button">Change</div>
                        </label>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div>
                                <h2 style={{ margin: 0 }}>{me.displayName}</h2>
                                <div style={{ color: '#666' }}>@{me.username}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 20, marginLeft: 20 }}>
                                <div><strong>{me.postsCount || 0}</strong><div style={{ color: '#666', fontSize: 12 }}>Posts</div></div>
                                <div><strong>{me.followersCount || 0}</strong><div style={{ color: '#666', fontSize: 12 }}>Followers</div></div>
                                <div><strong>{me.followingCount || 0}</strong><div style={{ color: '#666', fontSize: 12 }}>Following</div></div>
                            </div>
                        </div>
                    </div>
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

                {/* Instagram-like grid of thumbnails */}
                <div className="profile-grid">
                    {posts.map(p => {
                        // determine first media url (fallback if none)
                        const backend = 'http://localhost:4000';
                        let mediaUrl = null;
                        if (Array.isArray(p.media) && p.media.length > 0) mediaUrl = (p.media[0].url || p.media[0]);
                        else if (Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0) mediaUrl = p.mediaUrls[0];
                        else if (p.mediaUrl) mediaUrl = p.mediaUrl;
                        if (mediaUrl && mediaUrl.startsWith('/uploads')) mediaUrl = backend + encodeURI(mediaUrl);
                        else if (mediaUrl && !mediaUrl.startsWith('http')) { const parts = String(mediaUrl).split(/[/\\]/); mediaUrl = backend + '/uploads/' + encodeURIComponent(parts[parts.length - 1]); }
                        return (
                            <div key={p._id} className="profile-tile">
                                <div className="tile-media" style={{ backgroundImage: mediaUrl ? `url(${mediaUrl})` : undefined }} />
                                <div className="tile-caption">{p.content}</div>
                            </div>
                        )
                    })}
                </div>

                {/* legacy: detailed post cards for edit/delete */}
                <div style={{ marginTop: 18 }}>
                    {posts.map(p => <PostCard key={p._id} post={p} allowDelete={true} allowEdit={true} onDeleted={() => setPosts(posts.filter(x => x._id !== p._id))} onUpdated={(updated) => setPosts(posts.map(x => x._id === updated._id ? updated : x))} />)}
                </div>
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
