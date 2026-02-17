const TOKEN_KEY = 'token'
const EXPIRES_AT_KEY = 'token_expires_at'
const FEATURE_ACCESS_KEY = 'feature_access_snapshot'

export const setSession = (token: string, expiresInSeconds: number) => {
    localStorage.setItem(TOKEN_KEY, token)
    const ttl = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 900
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + ttl * 1000))
}

export const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
    localStorage.removeItem(FEATURE_ACCESS_KEY)
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const getExpiresAt = () => {
    const raw = localStorage.getItem(EXPIRES_AT_KEY)
    if (!raw) return 0
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
}

export const getRemainingSeconds = () => Math.max(0, Math.floor((getExpiresAt() - Date.now()) / 1000))

export const isSessionExpired = () => {
    const token = getToken()
    if (!token) return true
    return getRemainingSeconds() <= 0
}

export const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
