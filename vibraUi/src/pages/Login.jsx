import React, { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [msg, setMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const submit = async e => {
        e.preventDefault();
        setMsg('')
        setLoading(true)
        try {
            const r = await axios.post('http://localhost:4000/api/auth/login', { email, password });
            localStorage.setItem('token', r.data.token);
            setMsg('Logged in')
            navigate('/')
        } catch (err) {
            setMsg(err.response?.data?.error || err.message)
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="logo">Vibra</div>
                    <div className="auth-title">Welcome back</div>
                </div>
                <form onSubmit={submit} className="auth-form">
                    <label className="input-group">
                        <span className="input-label">Email</span>
                        <input className="input" placeholder="you@domain.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </label>

                    <label className="input-group">
                        <span className="input-label">Password</span>
                        <input className="input" placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </label>

                    <div style={{ color: 'red', minHeight: 20 }}>{msg}</div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                        <button className="button" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
                    </div>
                </form>

                <div className="auth-footer">
                    <span>Don't have an account? <Link to="/signup">Sign up</Link></span>
                </div>
            </div>
        </div>
    )
}
