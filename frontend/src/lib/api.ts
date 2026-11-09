const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function authHeader(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erreur ${res.status}`)
  }
  return res.json()
}

export { API_URL }
