import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'

const STEPS = ['patient', 'guardian', 'hospital']

export default function OnboardingPage() {
  const { data, update } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [patient, setPatient] = useState(data.patient)
  const [guardian, setGuardian] = useState(data.guardian)
  const [hospital, setHospital] = useState(data.hospital ?? { name: '', doctor: '' })

  const next = () => {
    if (step === 0) update({ patient })
    if (step === 1) update({ guardian })
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    update({
      patient,
      guardian,
      hospital: hospital.name ? hospital : null,
      onboarded: true,
    })
    navigate('/home')
  }

  return (
    <div className="page">
      <h1>프로필 설정</h1>
      <p className="muted">{step + 1} / {STEPS.length} 단계</p>

      {step === 0 && (
        <div className="card stack">
          <h2>환자 본인 정보</h2>
          <label htmlFor="p-name">이름</label>
          <input
            id="p-name"
            value={patient.name}
            onChange={(e) => setPatient({ ...patient, name: e.target.value })}
          />
          <label htmlFor="p-age">나이</label>
          <input
            id="p-age"
            type="number"
            value={patient.age}
            onChange={(e) => setPatient({ ...patient, age: e.target.value })}
          />
          <label htmlFor="p-phone">연락처</label>
          <input
            id="p-phone"
            value={patient.phone}
            onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
          />
        </div>
      )}

      {step === 1 && (
        <div className="card stack">
          <h2>보호자 연동</h2>
          <label htmlFor="g-name">보호자 이름</label>
          <input
            id="g-name"
            value={guardian.name}
            onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
          />
          <label htmlFor="g-phone">보호자 연락처</label>
          <input
            id="g-phone"
            value={guardian.phone}
            onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
          />
        </div>
      )}

      {step === 2 && (
        <div className="card stack">
          <h2>주요 병원 정보 (선택)</h2>
          <label htmlFor="h-name">병원명</label>
          <input
            id="h-name"
            value={hospital.name}
            onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
          />
          <label htmlFor="h-doctor">담당 진료과</label>
          <input
            id="h-doctor"
            value={hospital.doctor}
            onChange={(e) => setHospital({ ...hospital, doctor: e.target.value })}
          />
        </div>
      )}

      <button type="button" onClick={next}>
        {step < STEPS.length - 1 ? '다음' : '시작하기'}
      </button>
    </div>
  )
}
