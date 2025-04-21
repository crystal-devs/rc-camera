export const RC_API = process.env.RC_API
export const RC_API_VERSION = process.env.RC_API_VERSION

export const RC_API_BASE_URL = `${RC_API}/${RC_API_VERSION}/api`

// Album routes
export const ALBUM_ROUTE = `${RC_API_BASE_URL}/album` // used for get user albums, create an album, and if passed with album id as params, get album by id, and update album

// media routes

export const UPLOAD_MEDIA_ROUTE = `${RC_API_BASE_URL}/media/upload`