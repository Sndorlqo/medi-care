import 'dotenv/config'
import express from 'express'
import { parsePrescriptionFields } from './parsePrescription.js'

const { CLOVA_OCR_INVOKE_URL, CLOVA_OCR_SECRET, PORT = 3001 } = process.env

const app = express()
app.use(express.json({ limit: '10mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
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
    const clovaRes = await fetch(CLOVA_OCR_INVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': CLOVA_OCR_SECRET },
      body: JSON.stringify({
        version: 'V2',
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [{ format: format || 'jpg', name: 'prescription', data: image }],
      }),
    })
    const data = await clovaRes.json()
    if (!clovaRes.ok) {
      return res.status(clovaRes.status).json({ error: data.message || 'CLOVA OCR 요청 실패' })
    }

    const fields = data.images?.[0]?.fields ?? []
    res.json(parsePrescriptionFields(fields))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`OCR proxy server listening on :${PORT}`))
