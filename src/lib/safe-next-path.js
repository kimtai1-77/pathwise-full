

export const safeNextPath = (path, fallback = '/', origin) => {
    if (typeof path !== 'string' || !path.startsWith('/')) return fallback

    try {
        const currentOrigin = origin ?? window.location.origin
        const url = new URL(path, currentOrigin)
        return url.origin === currentOrigin ? `${url.pathname}${url.search}${url.hash}` : fallback
    } catch {
        return fallback
    }
}