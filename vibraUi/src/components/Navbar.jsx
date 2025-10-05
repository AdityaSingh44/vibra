import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import meStore, { loadMe } from '../stores/meStore'
import { uploadAvatar } from '../api'

export default function Navbar() {
    const [me, setMe] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const unsub = meStore.subscribe(setMe)
        loadMe()
        return unsub
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

    const onChangeAvatar = async (file) => {
        const token = localStorage.getItem('token')
        if (!file || !token) return
        try {
            const r = await uploadAvatar(file, token)
            // optimistic update via store
            meStore.setMe({ ...(me || {}), avatarUrl: r.url })
            window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatarUrl: r.url } }))
        } catch (err) { console.error(err) }
    }

    return (
        <div className="navbar container">
            <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div className="logo">Vibra</div>
                <div className="tagline">moments</div>
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 420, maxWidth: '60%' }}>
                    <input placeholder="Search" style={{ width: '100%', padding: '8px 12px', borderRadius: 999, border: '1px solid #f0f0f0', boxShadow: '0 4px 18px rgba(16,16,16,0.04)' }} />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {me ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                        <label style={{ position: 'relative', display: 'inline-block' }}>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onChangeAvatar(e.target.files && e.target.files[0])} />
                            <div className="avatar" style={{ width: 40, height: 40, borderRadius: 20, backgroundImage: me.avatarUrl ? `url(${full(me.avatarUrl)})` : undefined, backgroundSize: 'cover' }} />
                            <div style={{ position: 'absolute', right: -6, bottom: -6, background: 'white', borderRadius: 12, padding: 3 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#ff6a88" /><path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#ff6a88" /></svg>
                            </div>
                        </label>
                        <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{me.displayName}</div>
                    </div>
                ) : (
                    <a href="/login">Login</a>
                )}
            </div>
        </div>
    )
}
