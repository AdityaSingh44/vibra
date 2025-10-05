import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function getMe(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const r = await axios.get(`${BASE}/api/auth/me`, { headers })
    return r.data
}

export async function uploadAvatar(file, token) {
    const fd = new FormData(); fd.append('file', file)
    const r = await axios.post(`${BASE}/api/auth/avatar`, fd, { headers: { Authorization: `Bearer ${token}` } })
    return r.data
}

export async function uploadPostMedia(files, token) {
    const fd = new FormData();
    if (Array.isArray(files)) files.forEach(f => fd.append('files', f)); else fd.append('file', files);
    const r = await axios.post(`${BASE}/api/posts/media`, fd, { headers: { Authorization: `Bearer ${token}` } })
    return r.data
}

export async function createPost(content, mediaUrls, token) {
    // mediaUrls: array or undefined
    const r = await axios.post(`${BASE}/api/posts`, { content, mediaUrls }, { headers: { Authorization: `Bearer ${token}` } })
    return r.data
}

export async function getPosts(authorId) {
    const q = authorId ? `?authorId=${authorId}` : ''
    const r = await axios.get(`${BASE}/api/posts${q}`)
    return r.data
}

export async function getStories() {
    const r = await axios.get(`${BASE}/api/posts/stories`)
    return r.data
}

export async function uploadStory(file, token) {
    const fd = new FormData(); fd.append('file', file)
    const r = await axios.post(`${BASE}/api/auth/story`, fd, { headers: { Authorization: `Bearer ${token}` } })
    return r.data
}

export async function follow(userId, token) { const r = await axios.post(`${BASE}/api/auth/follow/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } }); return r.data }
export async function unfollow(userId, token) { const r = await axios.post(`${BASE}/api/auth/unfollow/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } }); return r.data }

export default { getMe, uploadAvatar, uploadPostMedia, createPost, getPosts, getStories, uploadStory, follow, unfollow }
