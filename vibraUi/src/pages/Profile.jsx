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
                <div className="avatar" style={{ width: 96, height: 96, borderRadius: 48, backgroundImage: me.avatarUrl ? `url(${me.avatarUrl})` : undefined, backgroundSize: 'cover' }} />
                <div>
                    <h2>{me.displayName}</h2>
                    <div style={{ color: '#666' }}>@{me.username}</div>
                </div>
            </div>
            <div style={{ marginTop: 16 }} className="card">
                <h3>About</h3>
                <p>Bio goes here</p>
            </div>
            <div style={{ marginTop: 16 }}>
                <h3>Your posts</h3>
                {posts.map(p => <PostCard key={p._id} post={p} allowDelete={true} allowEdit={true} onDeleted={() => setPosts(posts.filter(x => x._id !== p._id))} onUpdated={(updated) => setPosts(posts.map(x => x._id === updated._id ? updated : x))} />)}
            </div>
        </div>
    )
}
