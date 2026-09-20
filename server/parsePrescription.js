const SLOT_KEYWORDS = {
  아침: ['아침', '조식'],
  점심: ['점심', '중식'],
  저녁: ['저녁', '석식'],
  자기전: ['자기전', '자기 전', '취침전', '취침 전'],
}

// Note: no trailing \b after these patterns — JS regex \b is defined in terms
// of ASCII \w, so it never matches at a boundary right after a Hangul
// character (Hangul isn't a "word" char to the regex engine).
const DOSE_RE = /(\d+(?:\.\d+)?)\s*(정|캡슐|포|환|mL|ml|g)/
const FREQ_RE = /(\d+)\s*회/
const DAYS_RE = /(\d+)\s*일/
const DRUG_NAME_RE = /[가-힣A-Za-z0-9]{2,}(?:정|캡슐|시럽|과립|연고|크림|액|산)(?:\d+(?:mg|밀리그램))?/g
const MEDICATION_ROW_RE = /1\s*회\s*투약량|1\s*회\s*복용량|1\s*일\s*투여횟수|1\s*일\s*복용횟수|총\s*투약일수|총\s*복용일수/

// Korean prescription printouts commonly label rows exactly like this
// (matches the PRD's own field names) — matching the label first and
// reading the value after it avoids mixing up e.g. "1회 투약량" (a label,
// not a frequency) with the real "1일 투여횟수: 3회" frequency value.
const LABELS = {
  name: ['약품명', '약제명', '품목명'],
  dose: ['1회 투약량', '1회투약량', '1회 복용량', '1회복용량'],
  frequencyPerDay: ['1일 투여횟수', '1일투여횟수', '1일 복용횟수', '1일복용횟수', '투여횟수', '복용횟수'],
  totalDays: ['총 투여일수', '총투여일수', '총 투약일수', '총투약일수', '총 복용일수', '총복용일수'],
}

function valueAfterLabel(text, label) {
  const idx = text.indexOf(label)
  if (idx === -1) return null
  const rest = text.slice(idx + label.length)
  return rest.replace(/^\s*[:：]?\s*/, '')
}

// ponytail: regex + y-coordinate line clustering tuned to common Korean
// pharmacy printouts. Misparses unusual layouts — the existing low-confidence
// UI (ScanPage) lets the user fix fields by hand when this falls short.
function groupIntoLines(fields) {
  const words = fields
    .map((f) => {
      const vertices = f.boundingPoly?.vertices ?? []
      const y = vertices.reduce((sum, v) => sum + v.y, 0) / (vertices.length || 1)
      const x = vertices.reduce((sum, v) => sum + v.x, 0) / (vertices.length || 1)
        return {
          text: f.inferText,
          confidence: f.inferConfidence ?? 0,
          x,
          y,
          minX: Math.min(...vertices.map((vertex) => vertex.x), x),
          maxX: Math.max(...vertices.map((vertex) => vertex.x), x),
        }
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

  // A second document photographed next to the bag (a receipt, another page)
  // can land its text at the same height as a real row above. Same height
  // alone isn't enough to call it one row — a horizontal gap far wider than
  // any real column gap (normally under ~200px) means it's actually two
  // unrelated blocks that only coincide in y, so split them apart.
  const LINE_GAP_THRESHOLD = 220
  const splitLines = []
  for (const { words: lineWords } of lines) {
    const sorted = [...lineWords].sort((a, b) => a.x - b.x)
    let run = [sorted[0]]
    for (let i = 1; i < sorted.length; i += 1) {
      const runMaxX = Math.max(...run.map((w) => w.maxX))
      if (sorted[i].minX - runMaxX > LINE_GAP_THRESHOLD) {
        splitLines.push(run)
        run = []
      }
      run.push(sorted[i])
    }
    splitLines.push(run)
  }

  return splitLines.map((words) => ({
    text: words.map((w) => w.text).join(' '),
    confidence: words.reduce((s, w) => s + w.confidence, 0) / words.length,
    y: words.reduce((s, w) => s + w.y, 0) / words.length,
    minX: Math.min(...words.map((w) => w.minX)),
    maxX: Math.max(...words.map((w) => w.maxX)),
  }))
}

function getSlotNames(text) {
  const slots = []
  for (const [slot, keywords] of Object.entries(SLOT_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) slots.push(slot)
  }
  return slots
}

function compactText(text) {
  return text.replace(/\s+/g, '')
}

function getMedicationName(text) {
  const prefix = text.split(/1\s*회\s*투약량|1\s*회\s*복용량|1\s*일\s*투여횟수|1\s*일\s*복용횟수|총\s*투약일수|총\s*복용일수/)[0]
  const cleanedPrefix = prefix
    .replace(/약품명|약제명|품목명|약품사진/g, '')
    .replace(/[|:[\]()]|/g, '')
    .trim()
  if (cleanedPrefix.length >= 2) return cleanedPrefix.split(/\s+/).pop()
  return text.match(DRUG_NAME_RE)?.[0] ?? ''
}

// Real pharmacy printouts almost always header the drug table with "약품명"
// (+ "약품사진"/"복약안내" columns). Anchoring on that header's own width lets
// us drop anything outside the table — e.g. a second document (a receipt, a
// second prescription page) photographed side-by-side, which a plain
// fraction-of-image-width cutoff can't tell apart from the real table.
function findTableRightEdge(lines) {
  const header = lines.find((line) => line.text.includes('약품명'))
  return header ? header.maxX : null
}

// Bare dosage-form words ("경질캡슐", "정제") show up on their own line in the
// appearance/storage blurb under a drug's real row ("갈색/흰색 경질캡슐") and
// happen to match DRUG_NAME_RE just like a real product name does — but no
// real product is ever named exactly this, so treat an exact match as noise.
const GENERIC_FORM_WORDS = new Set([
  '정제', '경질캡슐', '연질캡슐', '캡슐', '과립', '시럽', '연고', '크림', '점안제', '패치',
])

function parseMedicationRows(allLines, prescriptionSlots) {
  const tableRightEdge = findTableRightEdge(allLines)
  const lines = tableRightEdge
    ? allLines.filter((line) => line.minX < tableRightEdge * 1.3)
    : allLines
  const maxX = Math.max(...lines.map((line) => line.maxX), 0)
  const candidates = lines
    .filter((line) => MEDICATION_ROW_RE.test(compactText(line.text)) || line.text.match(DRUG_NAME_RE))
    .map((line) => ({
      name: getMedicationName(line.text),
      y: line.y,
      minX: line.minX,
      line,
    }))
    .filter((candidate) => candidate.name.length >= 2 && candidate.minX < maxX * 0.65 && !GENERIC_FORM_WORDS.has(candidate.name))
    .filter((candidate, index, all) => all.findIndex((item) =>
      item.name === candidate.name && Math.abs(item.y - candidate.y) < 12
    ) === index)
    .sort((a, b) => a.y - b.y)

  return candidates.map((candidate, index) => {
    const previous = candidates[index - 1]
    const next = candidates[index + 1]
    const startY = previous ? (previous.y + candidate.y) / 2 : -Infinity
    const endY = next ? (candidate.y + next.y) / 2 : Infinity
    const rowLines = lines.filter((line) => line.y >= startY && line.y < endY)
    const rowText = rowLines.map((line) => line.text).join(' ')
    const compactRowText = compactText(rowText)
    const doseMatch = compactRowText.match(/(?:1회투약량|1회복용량)(\d+(?:\.\d+)?)(?=1일|$)/)
      ?? rowText.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|환|mL|ml|g)\s*(?:씩)?/)
    const frequencyMatch = compactRowText.match(/(?:1일투여횟수|1일복용횟수)(\d+)회?/) ?? compactRowText.match(/(\d+)회/)
    const daysMatch = compactRowText.match(/(?:총투약일수|총복용일수)(\d+)일?/) ?? compactRowText.match(/(\d+)일(?:분)?/)
    const found = [candidate.name, doseMatch, frequencyMatch, daysMatch].filter(Boolean).length
    const dose = doseMatch
      ? doseMatch[2] ? `${doseMatch[1]}${doseMatch[2]}` : `${Number(doseMatch[1])}회분`
      : ''

    return {
      name: candidate.name,
      dose,
      frequencyPerDay: frequencyMatch ? Number(frequencyMatch[1]) : 1,
      totalDays: daysMatch ? Number(daysMatch[1]) : 30,
      times: getSlotNames(rowText).length ? getSlotNames(rowText) : prescriptionSlots.slice(0, frequencyMatch ? Number(frequencyMatch[1]) : 0),
      tags: [],
      confidence: Math.min(1, (found / 4) * (rowLines.reduce((sum, line) => sum + line.confidence, 0) / (rowLines.length || 1))),
    }
  })
}

export function parsePrescriptionFields(clovaFields) {
  const lines = groupIntoLines(clovaFields)
  const rawText = lines.map((l) => l.text).join('\n')
  const prescriptionSlots = getSlotNames(rawText)
  const medications = parseMedicationRows(lines, prescriptionSlots)

  if (medications.length > 0) {
    const confidence = medications.reduce((sum, medication) => sum + medication.confidence, 0) / medications.length
    return {
      confidence,
      rawText,
      medications: medications.map(({ confidence: _confidence, ...medication }) => medication),
      fields: { ...medications[0], confidence: undefined },
    }
  }

  let name, dose, frequencyPerDay, totalDays
  const times = []

  // Pass 1: label-based extraction (handles the standard "라벨: 값" layout).
  for (const line of lines) {
    for (const label of LABELS.name) {
      const value = valueAfterLabel(line.text, label)
      if (value && !name) name = (value.match(DRUG_NAME_RE)?.[0] ?? value.split(/\s+/)[0])
    }
    for (const label of LABELS.dose) {
      const value = valueAfterLabel(line.text, label)
      const m = value?.match(DOSE_RE)
      if (m && !dose) dose = `${m[1]}${m[2]}`
    }
    for (const label of LABELS.frequencyPerDay) {
      const value = valueAfterLabel(line.text, label)
      const m = value?.match(FREQ_RE)
      if (m && !frequencyPerDay) frequencyPerDay = Number(m[1])
    }
    for (const label of LABELS.totalDays) {
      const value = valueAfterLabel(line.text, label)
      const m = value?.match(DAYS_RE)
      if (m && !totalDays) totalDays = Number(m[1])
    }
  }

  // Pass 2: generic fallback scan for whatever labels didn't catch.
  for (const line of lines) {
    if (!name) name = line.text.match(DRUG_NAME_RE)?.[0]
    if (!dose) {
      const m = line.text.match(DOSE_RE)
      if (m) dose = `${m[1]}${m[2]}`
    }
    if (!frequencyPerDay) {
      const m = line.text.match(FREQ_RE)
      if (m) frequencyPerDay = Number(m[1])
    }
    if (!totalDays) {
      const m = line.text.match(DAYS_RE)
      if (m) totalDays = Number(m[1])
    }
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
      times,
      tags: [],
    },
    medications: [{
      name: name ?? '',
      dose: dose ?? '',
      frequencyPerDay: frequencyPerDay ?? 1,
      totalDays: totalDays ?? 30,
      times,
      tags: [],
    }],
  }
}

function word(text, x, y, width = 120, height = 26, confidence = 0.95) {
  return {
    inferText: text,
    inferConfidence: confidence,
    boundingPoly: {
      vertices: [
        { x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height },
      ],
    },
  }
}

// A photo can catch a second, unrelated document next to the medicine bag
// (here: a payment receipt) — its text must never be mistaken for a drug row,
// and the drug count must come from whatever the bag actually lists, not an
// assumed fixed size.
{
  const fields = [
    word('약품명', 60, 300), word('약품사진', 260, 300), word('복약안내(투약량/횟수/일수)', 460, 300, 300),

    word('아루펜정400밀리그람', 60, 340), word('1회투약량1.00', 260, 340), word('1일투여횟수3', 460, 340), word('총투약일수3', 640, 340),
    word('대우세파클러캡슐250밀리그램', 60, 400), word('1회투약량1.00', 260, 400), word('1일투여횟수3', 460, 400), word('총투약일수3', 640, 400),
    word('한미파모티딘정20밀리그램', 60, 460), word('1회투약량1.00', 260, 460), word('1일투여횟수2', 460, 460), word('총투약일수3', 640, 460),

    // A receipt, photographed alongside the bag, sitting to the right of the
    // table — moderately offset, the way a second document laid next to the
    // bag actually lands, not pushed to the far edge of the frame.
    word('약제비총액(①+②+③)', 1200, 340), word('25,070원', 1500, 340),
    word('총수납금액', 1200, 620), word('7,500원', 1500, 620),
    // Something far off in the same frame (e.g. a barcode) stretches the
    // photo's overall width — a plain "fraction of image width" cutoff would
    // loosen up and let the receipt above sneak in as a result.
    word('9876543210123', 2600, 900, 200),
  ]
  const result = parsePrescriptionFields(fields)
  console.assert(
    result.medications.length === 3,
    `expected 3 medications from the bag, found ${result.medications.length}: ${JSON.stringify(result.medications.map((m) => m.name))}`,
  )
  console.assert(
    result.medications.every((m) => !m.name.includes('수납') && !m.name.includes('총액')),
    'a receipt line leaked into the medication list',
  )
}

// A bag can just as well list a single medication — the parser must not
// assume any fixed count.
{
  const fields = [
    word('약품명', 60, 300), word('약품사진', 260, 300), word('복약안내(투약량/횟수/일수)', 460, 300, 300),
    word('레보플로점안액', 60, 340), word('1회투약량1.00', 260, 340), word('1일투여횟수1', 460, 340), word('총투약일수1', 640, 340),
  ]
  const result = parsePrescriptionFields(fields)
  console.assert(
    result.medications.length === 1,
    `expected 1 medication, found ${result.medications.length}`,
  )
}

// The appearance/storage blurb under a real row ("갈색/흰색 경질캡슐") must not
// itself become a fake extra medication just because it matches DRUG_NAME_RE.
{
  const fields = [
    word('약품명', 60, 300), word('약품사진', 260, 300), word('복약안내(투약량/횟수/일수)', 460, 300, 300),
    word('대우세파클러캡슐250밀리그램', 60, 340), word('1회투약량1.00', 260, 340), word('1일투여횟수3', 460, 340), word('총투약일수3', 640, 340),
    word('갈색/흰색', 60, 380), word('경질캡슐', 220, 380),
    word('한미파모티딘정20밀리그램', 60, 460), word('1회투약량1.00', 260, 460), word('1일투여횟수2', 460, 460), word('총투약일수3', 640, 460),
  ]
  const result = parsePrescriptionFields(fields)
  console.assert(
    result.medications.length === 2,
    `expected 2 medications, found ${result.medications.length}: ${JSON.stringify(result.medications.map((m) => m.name))}`,
  )
}
