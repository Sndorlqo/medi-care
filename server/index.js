import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { parsePrescriptionFields } from './parsePrescription.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(dirname, '../dist')

const {
  CLOVA_OCR_INVOKE_URL,
  CLOVA_OCR_SECRET,
  MEDICINE_API_SERVICE_KEY,
  KAKAO_REST_API_KEY,
  KAKAO_CLIENT_SECRET,
  PORT = 3001,
} = process.env

const KAKAO_CATEGORY_CODES = { 병원: 'HP8', 약국: 'PM9' }

const app = express()
app.use(express.json({ limit: '20mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/api/medicine-info', async (req, res) => {
  const name = String(req.query.name || '').trim()
  if (!name) return res.status(400).json({ error: '약 이름이 필요해요.' })
  if (!MEDICINE_API_SERVICE_KEY) {
    return res.status(500).json({ error: 'MEDICINE_API_SERVICE_KEY가 설정되지 않았어요.' })
  }

  const apiUrl = new URL('https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList')
  apiUrl.search = new URLSearchParams({
    ServiceKey: decodeURIComponent(MEDICINE_API_SERVICE_KEY),
    pageNo: '1',
    numOfRows: '10',
    itemName: name,
    type: 'json',
  }).toString()

  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) })
    const data = await response.json()
    if (!response.ok || data?.header?.resultCode && data.header.resultCode !== '00') {
      return res.status(502).json({ error: data?.header?.resultMsg || '의약품 정보를 불러오지 못했어요.' })
    }

    const items = data?.body?.items?.item ?? data?.body?.items ?? data?.items?.item ?? data?.items ?? []
    const item = Array.isArray(items) ? items[0] : items
    res.json({
      medicine: item || null,
      source: '식품의약품안전처 의약품개요정보(e약은요)',
      sourceUrl: 'https://www.data.go.kr/data/15075057/openapi.do',
    })
  } catch (err) {
    res.status(502).json({ error: err.message || '의약품 정보를 불러오지 못했어요.' })
  }
})

async function searchKakaoCategory(type, lat, lng) {
  const categoryGroupCode = KAKAO_CATEGORY_CODES[type]
  const places = []
  for (let page = 1; page <= 3; page += 1) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/category.json')
    url.search = new URLSearchParams({
      category_group_code: categoryGroupCode,
      x: String(lng),
      y: String(lat),
      radius: '5000',
      sort: 'distance',
      page: String(page),
      size: '15',
    }).toString()

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    })
    if (!response.ok) break
    const data = await response.json()
    places.push(...data.documents.map((doc) => ({
      name: doc.place_name,
      type,
      address: doc.road_address_name || doc.address_name,
      phone: doc.phone || '',
      lat: Number(doc.y),
      lng: Number(doc.x),
      distance: Number(doc.distance),
      url: doc.place_url,
    })))
    if (data.meta.is_end) break
  }
  return places
}

app.get('/api/nearby-places', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat/lng가 필요해요.' })
  }
  if (!KAKAO_REST_API_KEY) {
    return res.status(500).json({ error: 'KAKAO_REST_API_KEY가 설정되지 않았어요.' })
  }

  try {
    const [hospitals, pharmacies] = await Promise.all([
      searchKakaoCategory('병원', lat, lng),
      searchKakaoCategory('약국', lat, lng),
    ])
    const places = [...hospitals, ...pharmacies].sort((a, b) => a.distance - b.distance)
    res.json({ places })
  } catch (err) {
    res.status(502).json({ error: err.message || '주변 장소를 불러오지 못했어요.' })
  }
})

app.get('/api/kakao-profile', async (req, res) => {
  const { code, redirectUri } = req.query
  console.log('[kakao-profile] request received:', { code: code?.slice(0, 8) + '...', redirectUri })
  if (!code || !redirectUri) return res.status(400).json({ error: 'code/redirectUri가 필요해요.' })
  if (!KAKAO_REST_API_KEY) return res.status(500).json({ error: 'KAKAO_REST_API_KEY가 설정되지 않았어요.' })

  try {
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code,
        ...(KAKAO_CLIENT_SECRET ? { client_secret: KAKAO_CLIENT_SECRET } : {}),
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('[kakao-profile] token exchange failed:', tokenData)
      return res.status(tokenRes.status).json({ error: tokenData.error_description || '카카오 토큰 발급에 실패했어요.' })
    }

    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profileRes.ok) {
      console.error('[kakao-profile] profile fetch failed:', profile)
      return res.status(profileRes.status).json({ error: '카카오 프로필 조회에 실패했어요.' })
    }

    console.log('[kakao-profile] profile response:', JSON.stringify(profile))
    const nickname = profile.kakao_account?.profile?.nickname || profile.properties?.nickname || ''
    res.json({ nickname })
  } catch (err) {
    res.status(502).json({ error: err.message || '카카오 로그인 처리 중 오류가 발생했어요.' })
  }
})

app.post('/api/ocr', async (req, res) => {
  if (!CLOVA_OCR_INVOKE_URL || !CLOVA_OCR_SECRET) {
    return res.status(500).json({
      error: 'CLOVA_OCR_INVOKE_URL / CLOVA_OCR_SECRET가 설정되지 않았어요. server/.env를 확인하세요.',
    })
  }

  const { image, format } = req.body
  if (!image) return res.status(400).json({ error: 'image가 필요해요.' })

  try {
    const normalizedFormat = format?.toLowerCase() === 'jpeg' ? 'jpg' : format || 'jpg'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const clovaRes = await fetch(CLOVA_OCR_INVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': CLOVA_OCR_SECRET },
      signal: controller.signal,
      body: JSON.stringify({
        version: 'V2',
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [{ format: normalizedFormat, name: 'prescription.jpg', data: image }],
      }),
    })
    clearTimeout(timeout)
    const data = await clovaRes.json()
    if (!clovaRes.ok) {
      return res.status(clovaRes.status).json({ error: data.message || 'CLOVA OCR 요청 실패' })
    }

    const fields = data.images?.[0]?.fields ?? []
    if (!fields.length) {
      return res.status(422).json({ error: '사진에서 글자를 읽지 못했어요. 약봉투를 반듯하게 펴고 다시 촬영해주세요.' })
    }
    res.json(parsePrescriptionFields(fields))
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'OCR 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.' })
    }
    res.status(500).json({ error: err.message })
  }
})

app.use((err, _req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '사진 파일이 너무 커요. 더 작은 사진으로 다시 시도해주세요.' })
  }
  next(err)
})

// Serve the built frontend (npm run build) so one service handles both the
// app and its API — no separate static host or CORS setup needed to deploy.
app.use(express.static(distDir))
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
