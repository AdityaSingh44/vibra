import React, { useState } from 'react'
import axios from 'axios'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [msg, setMsg] = useState('')
    const submit = async e => {
        e.preventDefault();
        try {
            const r = await axios.post('http://localhost:4000/api/auth/login', { email, password });
            localStorage.setItem('token', r.data.token);
            setMsg('Logged in');
        } catch (err) { setMsg(err.response?.data?.error || err.message) }
    }
    return (
        <form onSubmit={submit}>
            <h2>Login</h2>
            <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button>Login</button>
            <div>{msg}</div>
        </form>
    )
}
