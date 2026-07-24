import { ApiError } from './api'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    // Only set the JSON content-type when there's actually a JSON body —
    // Fastify's default body parser rejects `Content-Type: application/json`
    // on an empty body (FST_ERR_CTP_EMPTY_JSON_BODY), which broke every
    // bodyless POST (logout, release hold, cancel booking).
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const code = data?.code ?? 'UNKNOWN_ERROR'
    const message = data?.message ?? 'Something went wrong. Please try again.'
    throw new ApiError(code, message)
  }
  return data as T
}

export function toUndefinedOn404<T>(code: string) {
  return (error: unknown): T | undefined => {
    if (error instanceof ApiError && error.code === code) return undefined
    throw error
  }
}

export function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  return entries.length === 0 ? '' : `?${new URLSearchParams(entries).toString()}`
}
