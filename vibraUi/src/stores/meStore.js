import { getMe } from '../api'
import wsClient from '../wsClient'

let state = { me: null }
const listeners = new Set()

export function subscribe(cb) { listeners.add(cb); cb(state.me); return () => listeners.delete(cb) }
export function setMe(me) {
    // normalize id field so different parts of the app can use .id
    if (me && !me.id && me._id) me.id = me._id
    state.me = me; for (const l of listeners) l(me)
}

// connect to taru when a user is set
const originalSetMe = setMe
export function setMeAndConnect(me) {
    // ensure normalized
    if (me && !me.id && me._id) me.id = me._id
    originalSetMe(me)
    const uid = me && (me.id || me._id)
    if (uid) {
        try { wsClient.connectTaru(uid) } catch (e) { console.warn('taru connect failed', e.message) }
    }
}

export async function loadMe() {
    const token = localStorage.getItem('token')
    if (!token) return setMe(null)
    try {
        const me = await getMe(token)
        setMeAndConnect(me)
        return me
    } catch (err) {
        setMe(null)
        return null
    }
}

export default { subscribe, setMe, loadMe }
