import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { mockOcrScan } from '../data/mockOcr.js'
import { checkInteractions, getCareInstructions } from '../data/interactions.js'
import { OCR_SAMPLES, SLOTS } from '../data/seed.js'
import WarningBanner from '../components/WarningBanner.jsx'

const LOW_CONFIDENCE = 0.7

export default function ScanPage() {
  const { data, addDrug } = useData()
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [step, setStep] = useState('pick')
  const [confidence, setConfidence] = useState(null)
  const [fields, setFields] = useState(null)
  const [result, setResult] = useState(null)
  const [scanError, setScanError] = useState(null)

  const runScan = async (sampleKey) => {
    setStep('scanning')
    const { confidence, fields } = await mockOcrScan(sampleKey)
    setConfidence(confidence)
    setFields(fields)
    setStep('confirm')
  }

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const runRealScan = async (file) => {
    setStep('scanning')
    setScanError(null)
    try {
      const image = await fileToBase64(file)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, format: file.type.split('/')[1] || 'jpg' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '인식에 실패했어요.')
      setConfidence(data.confidence)
      setFields(data.fields)
      setStep('confirm')
    } catch (err) {
      setScanError(err.message)
      setStep('pick')
    }
  }

  const toggleTime = (slot) => {
    setFields((f) => ({
      ...f,
      times: f.times.includes(slot)
        ? f.times.filter((t) => t !== slot)
        : [...f.times, slot],
    }))
  }

  const save = () => {
    const drug = {
      id: crypto.randomUUID(),
      startDate: new Date().toISOString().slice(0, 10),
      ...fields,
      careInstructions: getCareInstructions(fields),
    }
    const warnings = checkInteractions(drug, data.drugs)
    addDrug(drug)
    setResult({ drug, warnings })
    setStep('done')
  }

  return (
    <div className="page">
      <h1>약봉투/처방전 등록</h1>

      {step === 'pick' && (
        <div className="stack">
          <p className="muted">
            카메라로 촬영하면 실제 사진을 인식해요. 카메라가 없다면 샘플로 체험해보세요.
          </p>
          {scanError && (
            <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
              <p style={{ color: 'var(--danger)' }}>인식 실패: {scanError}</p>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) runRealScan(file)
              e.target.value = ''
            }}
          />
          <button type="button" onClick={() => fileInput.current?.click()}>
            📷 사진 촬영하기
          </button>
          <p className="muted" style={{ marginTop: 12 }}>샘플로 체험하기</p>
          {OCR_SAMPLES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="secondary"
              onClick={() => runScan(s.key)}
            >
              {s.fields.name}
            </button>
          ))}
        </div>
      )}

      {step === 'scanning' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40 }}>🔍</p>
          <p>텍스트를 인식하고 있어요...</p>
        </div>
      )}

      {step === 'confirm' && fields && (
        <div className="stack">
          {confidence < LOW_CONFIDENCE && (
            <div className="card" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning)' }}>
              <p style={{ color: 'var(--warning)' }}>
                인식률이 낮아요 ({Math.round(confidence * 100)}%). 아래 내용을 확인·수정해주세요.
              </p>
              <button type="button" className="secondary" onClick={() => setStep('pick')}>
                다시 촬영하기
              </button>
            </div>
          )}

          <div className="card stack">
            <label htmlFor="d-name">약 이름</label>
            <input
              id="d-name"
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
            />
            <label htmlFor="d-dose">1회 복용량</label>
            <input
              id="d-dose"
              value={fields.dose}
              onChange={(e) => setFields({ ...fields, dose: e.target.value })}
            />
            <label htmlFor="d-freq">1일 복용 횟수</label>
            <input
              id="d-freq"
              type="number"
              value={fields.frequencyPerDay}
              onChange={(e) =>
                setFields({ ...fields, frequencyPerDay: Number(e.target.value) })
              }
            />
            <label htmlFor="d-days">총 복용 일수</label>
            <input
              id="d-days"
              type="number"
              value={fields.totalDays}
              onChange={(e) => setFields({ ...fields, totalDays: Number(e.target.value) })}
            />
            <label>복용 시간대</label>
            <div className="row">
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={fields.times.includes(slot) ? '' : 'secondary'}
                  onClick={() => toggleTime(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={save}>
            저장하기
          </button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="stack">
          <div className="card">
            <h2>✅ {result.drug.name} 등록 완료</h2>
            {result.drug.careInstructions.map((c, i) => (
              <p key={i}>· {c}</p>
            ))}
          </div>
          <WarningBanner warnings={result.warnings} />
          <button type="button" onClick={() => navigate('/home')}>
            홈으로
          </button>
        </div>
      )}
    </div>
  )
}
