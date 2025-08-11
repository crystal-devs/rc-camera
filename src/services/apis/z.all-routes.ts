export const RC_API = process.env.NEXT_PUBLIC_API_URL
export const RC_API_VERSION = process.env.NEXT_PUBLIC_RC_API_VERSION

export const RC_API_BASE_URL = `${RC_API}/api/${RC_API_VERSION}`

// Album routes
export const ALBUM_ROUTE = `${RC_API_BASE_URL}/album` // used for get user albums, create an album, and if passed with album id as params, get album by id, and update album

// media routes

export const UPLOAD_MEDIA_ROUTE = `${RC_API_BASE_URL}/media/upload`

// auth 
export const LOGIN_ROUTE = `${RC_API_BASE_URL}/auth/login`
export const VERIFY_USER_ROUTE = `${RC_API_BASE_URL}/auth/verify-clicky`

// report
export const REPORT_BUG_ROUTE = `${RC_API_BASE_URL}/report/bug`
