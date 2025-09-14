import React, { useState } from 'react'
import axios from 'axios'

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [msg, setMsg] = useState('')
    const submit = async e => {
        e.preventDefault();
        try {
            const r = await axios.post('http://localhost:4000/api/auth/signup', { email, password, displayName });
            localStorage.setItem('token', r.data.token);
            setMsg('Signed up');
        } catch (err) { setMsg(err.response?.data?.error || err.message) }
    }
    return (
        <form onSubmit={submit}>
            <h2>Signup</h2>
            <input placeholder="display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button>Signup</button>
            <div>{msg}</div>
        </form>
    )
}
