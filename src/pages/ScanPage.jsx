import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { mockOcrScan } from '../data/mockOcr.js'
import { checkInteractions, getCareInstructions, getMedicineApiInstructions } from '../data/interactions.js'
import { OCR_MULTI_SAMPLE, OCR_SAMPLES, SLOTS } from '../data/seed.js'
import WarningBanner from '../components/WarningBanner.jsx'

const LOW_CONFIDENCE = 0.7

function getDefaultTimes(frequencyPerDay) {
  if (frequencyPerDay === 3) return ['아침', '점심', '저녁']
  if (frequencyPerDay === 2) return ['아침', '저녁']
  return []
}

function normalizeMedications(medications, fallback) {
  const source = medications?.length ? medications : fallback ? [fallback] : []
  return source.filter((medication) => medication?.name?.trim()).map((medication) => ({
    ...medication,
    name: medication.name.trim(),
    dose: medication.dose || '',
    frequencyPerDay: Number(medication.frequencyPerDay) || 1,
    totalDays: Number(medication.totalDays) || 30,
    times: Array.isArray(medication.times) && medication.times.length
      ? medication.times
      : getDefaultTimes(Number(medication.frequencyPerDay) || 1),
    tags: Array.isArray(medication.tags) ? medication.tags : [],
  }))
}

export default function ScanPage() {
  const { data, addDrug } = useData()
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [step, setStep] = useState('pick')
  const [confidence, setConfidence] = useState(null)
  const [fields, setFields] = useState(null)
  const [result, setResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const runScan = async (sampleKey) => {
    setStep('scanning')
    const { confidence, fields, medications } = await mockOcrScan(sampleKey)
    setConfidence(confidence)
    setFields(normalizeMedications(medications, fields))
    setStep('confirm')
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') {
      reject(new Error('HEIC 사진은 지원되지 않아요. JPG 사진으로 다시 선택해주세요.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const maxDimension = 2000
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.naturalWidth * scale)
      canvas.height = Math.round(image.naturalHeight * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('사진을 읽을 수 없어요. JPG 또는 PNG 사진을 선택해주세요.'))
    }
    image.src = objectUrl
  })

  const runRealScan = async (file) => {
    setStep('scanning')
    setScanError(null)
    setSelectedFileName(file.name)
    try {
      const image = await fileToBase64(file)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, format: 'jpg' }),
      })
      const contentType = res.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await res.json()
        : { error: await res.text() }
      if (!res.ok) throw new Error(data.error || `OCR 서버 오류 (${res.status})`)
      if (!data.fields && !data.medications) throw new Error('OCR 결과를 받지 못했어요. 사진을 다시 선택해주세요.')
      const recognizedMedications = normalizeMedications(data.medications, data.fields)
      if (!recognizedMedications.length) throw new Error('약 이름을 찾지 못했어요. 약 이름이 보이도록 다시 촬영해주세요.')
      setConfidence(data.confidence)
      setFields(recognizedMedications)
      setStep('confirm')
    } catch (err) {
      setScanError(err.message)
      setStep('pick')
    }
  }

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInput.current?.click()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
    } catch {
      setScanError('카메라를 열 수 없어요. 브라우저의 카메라 권한을 허용하거나 사진 파일을 선택해주세요.')
      fileInput.current?.click()
    }
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        closeCamera()
        runRealScan(new File([blob], 'prescription.jpg', { type: 'image/jpeg' }))
      }
    }, 'image/jpeg', 0.9)
  }

  const toggleMedicationTime = (medicationIndex, slot) => {
    setFields((medications) => medications.map((medication, index) => index === medicationIndex
      ? {
          ...medication,
          times: medication.times.includes(slot)
            ? medication.times.filter((time) => time !== slot)
            : [...medication.times, slot],
        }
      : medication
    ))
  }

  const save = async () => {
    const drugs = await Promise.all(fields.map(async (medication) => {
      let medicineInfo = null
      try {
        const response = await fetch(`/api/medicine-info?name=${encodeURIComponent(medication.name)}`)
        if (response.ok) {
          const result = await response.json()
          medicineInfo = result.medicine
            ? { ...result.medicine, source: result.source, sourceUrl: result.sourceUrl }
            : null
        }
      } catch {
        // Keep registration available when the external service is unavailable.
      }

      const apiInstructions = getMedicineApiInstructions(medicineInfo)
      return {
      id: crypto.randomUUID(),
      startDate: new Date().toISOString().slice(0, 10),
      ...medication,
      medicineInfo,
      careInstructions: [...new Set([...getCareInstructions(medication), ...apiInstructions])],
      }
    }))
    const warnings = drugs.flatMap((drug) => checkInteractions(drug, data.drugs))
    drugs.forEach(addDrug)
    setResult({ drugs, warnings })
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
            id="prescription-file"
            type="file"
            accept="image/*"
            capture="environment"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setSelectedFileName(file.name)
                runRealScan(file)
              } else {
                setScanError('사진을 선택하지 않았어요.')
              }
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => {
              setScanError(null)
              fileInput.current?.click()
            }}
          >
            📁 사진 파일 선택하기
          </button>
          {selectedFileName && <p className="muted">선택한 파일: {selectedFileName}</p>}
          <button type="button" onClick={openCamera}>
            📷 카메라로 촬영하기
          </button>
          {cameraOpen && (
            <div className="card stack">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: 12, background: '#111' }}
              />
              <div className="row">
                <button type="button" onClick={capturePhoto}>사진 촬영</button>
                <button type="button" className="secondary" onClick={closeCamera}>닫기</button>
              </div>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12 }}>샘플로 체험하기</p>
          <button
            type="button"
            onClick={() => runScan(OCR_MULTI_SAMPLE.key)}
          >
            첨부 약봉투 샘플 ({OCR_MULTI_SAMPLE.medications.length}개 약)
          </button>
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
          <p className="muted">인식된 약 {fields.length}개</p>
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

          {fields.map((medication, medicationIndex) => (
            <div className="card stack" key={`${medication.name}-${medicationIndex}`}>
              <h2>약 {medicationIndex + 1}</h2>
              <label htmlFor={`d-name-${medicationIndex}`}>약 이름</label>
              <input
                id={`d-name-${medicationIndex}`}
                value={medication.name}
                onChange={(e) => setFields((items) => items.map((item, index) =>
                  index === medicationIndex ? { ...item, name: e.target.value } : item
                ))}
              />
              <label htmlFor={`d-dose-${medicationIndex}`}>1회 복용량</label>
              <input
                id={`d-dose-${medicationIndex}`}
                value={medication.dose}
                onChange={(e) => setFields((items) => items.map((item, index) =>
                  index === medicationIndex ? { ...item, dose: e.target.value } : item
                ))}
              />
              <label htmlFor={`d-freq-${medicationIndex}`}>1일 복용 횟수</label>
              <input
                id={`d-freq-${medicationIndex}`}
                type="number"
                value={medication.frequencyPerDay}
                onChange={(e) => setFields((items) => items.map((item, index) =>
                  index === medicationIndex
                    ? {
                        ...item,
                        frequencyPerDay: Number(e.target.value),
                        times: getDefaultTimes(Number(e.target.value)).length
                          ? getDefaultTimes(Number(e.target.value))
                          : item.times,
                      }
                    : item
                ))}
              />
              <label htmlFor={`d-days-${medicationIndex}`}>총 복용 일수</label>
              <input
                id={`d-days-${medicationIndex}`}
                type="number"
                value={medication.totalDays}
                onChange={(e) => setFields((items) => items.map((item, index) =>
                  index === medicationIndex ? { ...item, totalDays: Number(e.target.value) } : item
                ))}
              />
              <label>복용 시간대</label>
              {medication.times.length === 0 && <p className="muted">사진에서 시간대가 확인되지 않았어요. 직접 선택해주세요.</p>}
              <div className="row">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={medication.times.includes(slot) ? '' : 'secondary'}
                    onClick={() => toggleMedicationTime(medicationIndex, slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button type="button" onClick={save}>
            저장하기
          </button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="stack">
          <div className="card">
            <h2>✅ {result.drugs.length}개 약 등록 완료</h2>
            {result.drugs.map((drug) => (
              <div key={drug.id}>
                <strong>{drug.name}</strong>
                {drug.careInstructions.map((careInstruction, index) => (
                  <p key={index}>· {careInstruction}</p>
                ))}
              </div>
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
