import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './styles.css'
// Simple global error overlay for easier debugging when a runtime error causes a blank page
function showErrorOverlay(message) {
    try {
        const id = 'app-error-overlay'
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            el.style.position = 'fixed'
            el.style.left = '12px'
            el.style.right = '12px'
            el.style.top = '12px'
            el.style.padding = '12px'
            el.style.background = 'rgba(255,230,230,0.98)'
            el.style.border = '1px solid #ff6b6b'
            el.style.zIndex = 99999
            el.style.borderRadius = '8px'
            el.style.fontFamily = 'monospace'
            el.style.whiteSpace = 'pre-wrap'
            el.style.maxHeight = '80vh'
            el.style.overflow = 'auto'
            document.body.appendChild(el)
        }
        el.textContent = String(message)
    } catch (e) { console.error('overlay failed', e) }
}

window.onerror = function (msg, src, line, col, err) {
    showErrorOverlay((err && err.stack) || `${msg} at ${src}:${line}:${col}`)
}
window.addEventListener('unhandledrejection', function (ev) { showErrorOverlay(ev.reason && (ev.reason.stack || ev.reason)) })

try {
    createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <BrowserRouter>
                <Routes>
                    <Route path="/*" element={<App />} />
                </Routes>
            </BrowserRouter>
        </React.StrictMode>
    )
} catch (err) {
    showErrorOverlay(err && err.stack ? err.stack : String(err))
}
