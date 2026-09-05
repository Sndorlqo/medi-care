const SLOT_KEYWORDS = {
  아침: ['아침', '조식'],
  점심: ['점심', '중식'],
  저녁: ['저녁', '석식'],
  자기전: ['자기전', '자기 전', '취침전', '취침 전'],
}

const DOSE_RE = /(\d+(?:\.\d+)?)\s*(정|캡슐|포|환|mL|ml|g)\b/
const FREQ_RE = /1일\s*(\d+)\s*회|하루\s*(\d+)\s*회/
const DAYS_RE = /(\d+)\s*일\s*분|총\s*(\d+)\s*일/
const DRUG_NAME_RE = /[가-힣A-Za-z]{2,}(정|캡슐|시럽|과립|연고|크림|액|산)\b/

// ponytail: regex + y-coordinate line clustering tuned to common Korean
// pharmacy printouts. Misparses unusual layouts — the existing low-confidence
// UI (ScanPage) lets the user fix fields by hand when this falls short.
function groupIntoLines(fields) {
  const words = fields
    .map((f) => {
      const vertices = f.boundingPoly?.vertices ?? []
      const y = vertices.reduce((sum, v) => sum + v.y, 0) / (vertices.length || 1)
      const x = vertices.reduce((sum, v) => sum + v.x, 0) / (vertices.length || 1)
      return { text: f.inferText, confidence: f.inferConfidence ?? 0, x, y }
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)

  const LINE_HEIGHT_THRESHOLD = 15
  const lines = []
  for (const word of words) {
    const line = lines.find((l) => Math.abs(l.y - word.y) < LINE_HEIGHT_THRESHOLD)
    if (line) {
      line.words.push(word)
      line.y = (line.y * (line.words.length - 1) + word.y) / line.words.length
    } else {
      lines.push({ y: word.y, words: [word] })
    }
  }

  return lines.map((l) => ({
    text: [...l.words].sort((a, b) => a.x - b.x).map((w) => w.text).join(' '),
    confidence: l.words.reduce((s, w) => s + w.confidence, 0) / l.words.length,
  }))
}

export function parsePrescriptionFields(clovaFields) {
  const lines = groupIntoLines(clovaFields)
  const rawText = lines.map((l) => l.text).join('\n')

  let name, dose, frequencyPerDay, totalDays
  const times = []

  for (const line of lines) {
    const nameMatch = line.text.match(DRUG_NAME_RE)
    if (nameMatch && !name) name = nameMatch[0]

    const doseMatch = line.text.match(DOSE_RE)
    if (doseMatch && !dose) dose = `${doseMatch[1]}${doseMatch[2]}`

    const freqMatch = line.text.match(FREQ_RE)
    if (freqMatch && !frequencyPerDay) frequencyPerDay = Number(freqMatch[1] || freqMatch[2])

    const daysMatch = line.text.match(DAYS_RE)
    if (daysMatch && !totalDays) totalDays = Number(daysMatch[1] || daysMatch[2])

    for (const [slot, keywords] of Object.entries(SLOT_KEYWORDS)) {
      if (!times.includes(slot) && keywords.some((k) => line.text.includes(k))) {
        times.push(slot)
      }
    }
  }

  const found = [name, dose, frequencyPerDay, totalDays].filter(Boolean).length
  const avgOcrConfidence = lines.length
    ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length
    : 0
  const confidence = (found / 4) * (avgOcrConfidence || 0.5)

  return {
    confidence,
    rawText,
    fields: {
      name: name ?? '',
      dose: dose ?? '',
      frequencyPerDay: frequencyPerDay ?? 1,
      totalDays: totalDays ?? 30,
      times: times.length ? times : ['아침'],
      tags: [],
    },
  }
}
