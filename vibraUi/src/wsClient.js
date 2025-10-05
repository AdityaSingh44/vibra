import { io } from 'socket.io-client'

const BASE = import.meta.env.VITE_TARU_BASE || 'http://localhost:3001'

let socket = null

export function connectTaru(userId) {
    if (socket && socket.connected) return socket
    socket = io(BASE, { path: '/socket', query: { userId }, transports: ['websocket'] })
    socket.on('connect', () => console.log('taru socket connected', socket.id))
    socket.on('disconnect', () => console.log('taru socket disconnected'))
    socket.on('message', (msg) => console.log('taru message', msg))
    socket.on('message_status', (s) => console.log('taru message_status', s))
    return socket
}

export function subscribeConversation(conversationId) {
    if (!socket) throw new Error('socket not connected')
    socket.emit('subscribe', { conversationId })
}

export function sendMessage(conversationId, body, cb) {
    if (!socket) throw new Error('socket not connected')
    socket.emit('send_message', { conversationId, body }, cb)
}

export default { connectTaru, subscribeConversation, sendMessage }
