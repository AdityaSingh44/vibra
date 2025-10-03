import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
    const [me, setMe] = useState(null)
    const navigate = useNavigate()
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return
        axios.get('http://localhost:4000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setMe(r.data)).catch(() => setMe(null))
        // listen for profile updates from other parts of the app
        const onProfile = (e) => {
            const d = e && e.detail;
            if (!d) return;
            setMe(prev => ({ ...(prev || {}), ...(d.avatarUrl ? { avatarUrl: d.avatarUrl } : {}), ...(d.bio ? { bio: d.bio } : {}) }))
        }
        window.addEventListener('profileUpdated', onProfile)
        return () => window.removeEventListener('profileUpdated', onProfile)
    }, [])
    const backend = 'http://localhost:4000'
    const full = (u) => {
        if (!u) return u;
        if (u.startsWith('http://') || u.startsWith('https://')) return encodeURI(u);
        if (u.startsWith('/uploads')) return backend + encodeURI(u);
        const parts = u.split(/[/\\]/);
        const name = parts[parts.length - 1];
        return backend + '/uploads/' + encodeURIComponent(name);
    }

    return (
        <div className="navbar container">
            <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Vibra</div>
            <div>
                <input placeholder="Search" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e6e6e6' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {me ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                        <div className="avatar" style={{ width: 36, height: 36, borderRadius: 18, backgroundImage: me.avatarUrl ? `url(${full(me.avatarUrl)})` : undefined, backgroundSize: 'cover' }} />
                        <div style={{ fontSize: 14 }}>{me.displayName}</div>
                    </div>
                ) : (
                    <a href="/login">Login</a>
                )}
            </div>
        </div>
    )
}
