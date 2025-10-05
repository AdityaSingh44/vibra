import { getMe } from '../api'

let state = { me: null }
const listeners = new Set()

export function subscribe(cb) { listeners.add(cb); cb(state.me); return () => listeners.delete(cb) }
export function setMe(me) { state.me = me; for (const l of listeners) l(me) }

export async function loadMe() {
    const token = localStorage.getItem('token')
    if (!token) return setMe(null)
    try {
        const me = await getMe(token)
        setMe(me)
        return me
    } catch (err) {
        setMe(null)
        return null
    }
}

export default { subscribe, setMe, loadMe }
