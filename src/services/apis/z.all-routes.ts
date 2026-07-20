export const RC_API = process.env.NEXT_PUBLIC_API_URL
export const RC_API_VERSION = process.env.NEXT_PUBLIC_RC_API_VERSION

export const RC_API_BASE_URL = `${RC_API}/api/${RC_API_VERSION}`

// Album routes
export const ALBUM_ROUTE = `${RC_API_BASE_URL}/album` // used for get user albums, create an album, and if passed with album id as params, get album by id, and update album

// media routes

export const UPLOAD_MEDIA_ROUTE = `${RC_API_BASE_URL}/media/upload`

// auth
export const LOGIN_ROUTE = `${RC_API_BASE_URL}/auth/login`
export const REGISTER_ROUTE = `${RC_API_BASE_URL}/auth/register`
export const REFRESH_TOKEN_ROUTE = `${RC_API_BASE_URL}/auth/refresh`
export const LOGOUT_ROUTE = `${RC_API_BASE_URL}/auth/logout`
export const VERIFY_USER_ROUTE = `${RC_API_BASE_URL}/auth/verify-clicky`
export const CSRF_TOKEN_ROUTE = `${RC_API_BASE_URL}/auth/csrf-token`
export const GOOGLE_OAUTH_ROUTE = `${RC_API_BASE_URL}/auth/google`

// SSE routes
export const SSE_UPLOAD_PROGRESS_ROUTE = (eventId: string) => `${RC_API_BASE_URL}/sse/upload-progress/${eventId}`