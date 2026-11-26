export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

interface ApiErrorResponse {
  error?: ApiErrorBody
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false
  }
  const error = value.error
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    'code' in error &&
    typeof error.code === 'string'
  )
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.message ?? 'The request could not be completed.')
    this.name = 'ApiError'
    this.status = status
    this.code = body?.code ?? 'REQUEST_FAILED'
    this.details = body?.details
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000')
  .trim()
  .replace(/\/+$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Unable to reach JobTrack. Check your connection and try again.',
    })
  }

  const contentType = response.headers.get('content-type') ?? ''
  let body: unknown
  if (contentType.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      throw new ApiError(response.status, {
        code: 'INVALID_RESPONSE',
        message: 'The server returned a response that could not be read.',
      })
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      isApiErrorResponse(body) ? body.error : undefined,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return body as T
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, data?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  put: <T>(path: string, data?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  patch: <T>(path: string, data?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'DELETE' }),
}
