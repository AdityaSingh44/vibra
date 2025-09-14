import React from 'react'

export default function StoriesTray({ stories = [] }) {
    return (
        <div className="card stories">
            {stories.length === 0 ? (
                <div className="story"><div className="thumb" /> <div className="muted">No stories</div></div>
            ) : stories.map((s, idx) => (
                <div className="story" key={s._id || idx}>
                    <div className="thumb" style={{ backgroundImage: s.author?.avatarUrl ? `url(${s.author.avatarUrl})` : undefined, backgroundSize: 'cover' }}></div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>{s.author?.displayName || 'User'}</div>
                </div>
            ))}
        </div>
    )
}
