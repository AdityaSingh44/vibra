import React, { useEffect, useState } from 'react'
import axios from 'axios'
import wsClient from '../wsClient'
import meStore from '../stores/meStore'

const TARU_BASE = import.meta.env.VITE_TARU_BASE || 'http://localhost:3001'

const USERS_API = import.meta.env.VITE_API_BASE ? (import.meta.env.VITE_API_BASE + '/api/auth/users') : 'http://localhost:4000/api/auth/users'

export default function Messages() {
    const [me, setMe] = useState(null)
    const [conversations, setConversations] = useState([])
    const [activeConv, setActiveConv] = useState(null)
    const [text, setText] = useState('')
    const [users, setUsers] = useState([])
    const [toUser, setToUser] = useState('')

    useEffect(() => {
        const unsub = meStore.subscribe(m => setMe(m))
        return unsub
    }, [])

    useEffect(() => { if (me && (me.id || me._id)) wsClient.connectTaru(me.id || me._id) }, [me])

    useEffect(() => {
        async function loadUsers() {
            try {
                const r = await axios.get(USERS_API)
                setUsers(r.data.users || [])
                setToUser((r.data.users && r.data.users[0] && r.data.users[0]._id) || '')
            } catch (e) { console.error('failed load users', e.message) }
        }
        loadUsers()
    }, [])

    async function loadConversations() {
        try {
            const r = await axios.get(`${TARU_BASE}/conversations`, { headers: { 'x-user-id': me?.id || 'user-1' } })
            setConversations(r.data.conversations || [])
        } catch (e) { console.error(e) }
    }

    useEffect(() => { loadConversations() }, [me])

    async function openConversation(conv) {
        setActiveConv({ ...conv, messages: [] })
        try {
            const r = await axios.get(`${TARU_BASE}/conversations/${conv._id || conv.id}/messages`, { headers: { 'x-user-id': me?.id || 'user-1' } })
            setActiveConv({ ...conv, messages: r.data.messages })
        } catch (e) { console.error(e) }
    }

    async function startConversationWith(userId) {
        try {
            const myId = me?.id || me?._id
            if (!myId) return alert('Please login to start a conversation')
            if (!userId) return alert('Please select a user to message')
            if (userId === myId) return alert('Cannot message yourself')

            const participants = [myId, userId]
            const r = await axios.post(`${TARU_BASE}/conversations`, { participants, type: 'dm' }, { headers: { 'x-user-id': myId } })
            await loadConversations();
            // server may return the conv in body
            openConversation(r.data || r.data.conversation || r.data)
        } catch (e) { console.error('startConversation failed', e.response?.data || e.message) }
    }

    async function send() {
        if (!activeConv || !text) return
        try {
            const convId = activeConv._id || activeConv.id
            const myId = me?.id || me?._id
            // ensure socket connection
            try { wsClient.connectTaru(myId) } catch (e) { /* ignore */ }

            if (wsClient && wsClient.sendMessage) {
                wsClient.sendMessage(convId, { text }, (ack) => {
                    if (ack && ack.ok) {
                        const msg = { _id: ack.messageId, conversationId: convId, senderId: myId, body: { text }, status: 'sent', createdAt: new Date().toISOString() }
                        setActiveConv(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }))
                    } else {
                        console.warn('socket send ack error', ack)
                    }
                })
            } else {
                // fallback to HTTP
                const r = await axios.post(`${TARU_BASE}/conversations/${convId}/messages`, { body: { text } }, { headers: { 'x-user-id': myId } })
                const msg = r.data
                setActiveConv(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }))
            }
            setText('')
        } catch (e) { console.error('send failed', e.response?.data || e.message) }
    }

    return (
        <div className="container" style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 320, borderRight: '1px solid #f0f0f0', padding: 12 }}>
                <div style={{ marginBottom: 12 }}>
                    <label>Message someone:</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <select value={toUser} onChange={e => setToUser(e.target.value)}>
                            <option value="">Select user</option>
                            {users.map(u => <option key={u._id} value={u._id}>{u.displayName || u.username}</option>)}
                        </select>
                        <button onClick={() => startConversationWith(toUser)}>Start</button>
                    </div>
                </div>

                <div>
                    <div style={{ fontWeight: 700 }}>Conversations</div>
                    {conversations.length === 0 ? <div style={{ color: '#888', marginTop: 8 }}>No conversations yet</div> : (
                        conversations.map(c => (
                            <div key={c._id || c.id} style={{ padding: 8, cursor: 'pointer' }} onClick={() => openConversation(c)}>
                                <div style={{ fontSize: 13 }}>{c.type === 'dm' ? c.participants.find(p => p !== me?.id) : 'Group'}</div>
                                <div style={{ fontSize: 12, color: '#666' }}>{c.lastMessage?.text}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div style={{ flex: 1, padding: 12 }}>
                {!activeConv ? (
                    <div style={{ color: '#888' }}>Select a conversation or start a new message</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
                        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                            {(activeConv.messages || []).map(m => (
                                <div key={m._id} style={{ margin: '8px 0', textAlign: m.senderId === me?.id ? 'right' : 'left' }}>
                                    <div style={{ display: 'inline-block', background: m.senderId === me?.id ? '#e6fffa' : '#f5f5f5', padding: 8, borderRadius: 8 }}>{m.body.text}</div>
                                    <div style={{ fontSize: 10, color: '#999' }}>{new Date(m.createdAt).toLocaleTimeString()}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input style={{ flex: 1 }} value={text} onChange={e => setText(e.target.value)} />
                            <button onClick={send}>Send</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
