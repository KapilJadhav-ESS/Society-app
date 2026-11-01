// Photos, videos and PDFs: kept inline on the device in demo mode,
// uploaded to Supabase Storage (bucket "media") in cloud mode.
import { CLOUD } from './config'
import { uploadDataUrl } from './cloud'
import { db } from './db'

export const storeMedia = (dataUrl, name) => (CLOUD ? uploadDataUrl(db.societyId, dataUrl, name) : Promise.resolve(dataUrl))
