import React from 'react'
import { useNavigate } from 'react-router-dom'

import wsClient from '../wsClient'
import meStore from '../stores/meStore'

const TARU_BASE = import.meta.env.VITE_TARU_BASE || 'http://localhost:3001'

export default function MessagesButton() {
    const navigate = useNavigate()
    return (
        <div>
            <button onClick={(e) => { e.stopPropagation(); navigate('/messages') }} style={{ padding: 8 }}>Messages</button>
        </div>
    )
}
