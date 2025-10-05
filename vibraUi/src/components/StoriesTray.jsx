import React, { useState } from 'react'
import axios from 'axios'
import StoryViewer from './StoryViewer'

export default function StoriesTray({ stories = [], onStoriesUpdated }) {
    const [uploading, setUploading] = useState(false)
    const [localStories, setLocalStories] = useState(stories)

    // keep local stories in sync when parent prop changes
    React.useEffect(() => { setLocalStories(stories || []) }, [stories])
    const backend = 'http://localhost:4000'
    const full = (u) => {
        if (!u) return u;
        if (u.startsWith('http://') || u.startsWith('https://')) return encodeURI(u);
        if (u.startsWith('/uploads')) return backend + encodeURI(u);
        const parts = u.split(/[/\\]/);
        const name = parts[parts.length - 1];
        return backend + '/uploads/' + encodeURIComponent(name);
    }
    const addStory = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', file);
        const token = localStorage.getItem('token');
        try {
            const r = await axios.post('http://localhost:4000/api/auth/story', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            // if server returned created story, add to local list for immediate visibility
            if (r.data && r.data.story) {
                try {
                    setLocalStories(prev => [r.data.story, ...(prev || [])].slice(0, 50));
                } catch (e) { }
            }
            // also call optional updater to let parent re-fetch if desired
            onStoriesUpdated && onStoriesUpdated();
        } catch (err) { console.error(err) }
        setUploading(false);
    }
    const [selectedAuthor, setSelectedAuthor] = useState(null)

    // group stories by author id and pick latest for the tray preview
    const grouped = React.useMemo(() => {
        const map = new Map();
        // always use localStories (kept in sync with parent on prop changes). Do NOT fall back
        // to the parent `stories` prop when localStories is empty — we want deletions to
        // immediately remove thumbnails.
        const list = (localStories || []);
        list.forEach(s => {
            const aid = (s.author && (s.author._id || s.authorId)) || 'unknown';
            if (!map.has(aid)) map.set(aid, []);
            map.get(aid).push(s);
        });
        // sort each author's stories by createdAt ascending so viewer plays oldest->newest
        const normalized = {};
        map.forEach((arr, aid) => {
            const sorted = arr.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            normalized[aid] = sorted;
        });
        // order authors by most recent story time desc and filter out any empty lists
        const authors = Array.from(map.keys()).filter(aid => (normalized[aid] || []).length > 0).sort((a, b) => {
            const aLatest = normalized[a][normalized[a].length - 1];
            const bLatest = normalized[b][normalized[b].length - 1];
            return new Date(bLatest.createdAt) - new Date(aLatest.createdAt);
        });
        return { normalized, authors };
    }, [localStories, stories]);

    const [selected, setSelected] = useState(null)

    return (
        <div className="card stories">
            <div className="story">
                <label style={{ cursor: 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => addStory(e.target.files && e.target.files[0])} />
                    <div className="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{uploading ? 'Uploading...' : 'Add'}</div>
                </label>
                <div style={{ fontSize: 12, marginTop: 6 }}>Your story</div>
            </div>
            {(!grouped.authors || grouped.authors.length === 0) ? (
                <div className="story"><div className="thumb" /> <div className="muted">No stories</div></div>
            ) : grouped.authors.map((aid, idx) => {
                const arr = grouped.normalized[aid] || [];
                const preview = arr[arr.length - 1] || {};
                const author = preview.author || {};
                return (
                    <div className="story" key={aid || idx} onClick={() => { setSelected({ authorId: aid, stories: arr }); }} style={{ cursor: 'pointer' }}>
                        <div className="thumb" style={{ backgroundImage: author.avatarUrl ? `url(${full(author.avatarUrl)})` : undefined, backgroundSize: 'cover' }}></div>
                        <div style={{ fontSize: 12, marginTop: 6 }}>{author.displayName || 'User'}</div>
                    </div>
                )
            })}
            <StoryViewer group={selected} onClose={() => setSelected(null)} duration={4000} onDeleted={(s) => {
                try {
                    // remove the specific story from localStories
                    setLocalStories(prev => (prev || []).filter(x => !(x.url === s.url && new Date(x.createdAt).getTime() === new Date(s.createdAt).getTime())));
                } catch (e) { }
            }} />
        </div>
    )
}
