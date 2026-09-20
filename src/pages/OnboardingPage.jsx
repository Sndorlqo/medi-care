import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'

export default function OnboardingPage() {
  const { data, update } = useData()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(data.patient)
  const [guardian, setGuardian] = useState(data.guardian)
  const [hospital, setHospital] = useState(data.hospital ?? { name: '', doctor: '' })

  const setPatientField = (field) => (e) => setPatient({ ...patient, [field]: e.target.value })

  const submit = () => {
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
      <h1>내 정보 등록</h1>
      <p className="muted">건강 정보를 알려주세요. 안전한 복약 안내를 위해 꼭 필요해요.</p>

      <div className="card stack">
        <div className="field-grid">
          <div>
            <label htmlFor="p-name">이름 *</label>
            <input id="p-name" value={patient.name} onChange={setPatientField('name')} />
          </div>
          <div>
            <label htmlFor="p-age">나이 *</label>
            <input id="p-age" type="number" value={patient.age} onChange={setPatientField('age')} />
          </div>
        </div>

        <label htmlFor="p-conditions">기저질환</label>
        <input id="p-conditions" placeholder="고혈압, 당뇨" value={patient.conditions} onChange={setPatientField('conditions')} />

        <div className="field-grid">
          <div>
            <label htmlFor="p-weight">몸무게</label>
            <input id="p-weight" placeholder="68kg" value={patient.weight} onChange={setPatientField('weight')} />
          </div>
          <div>
            <label htmlFor="p-surgery">수술 여부</label>
            <input id="p-surgery" placeholder="없음" value={patient.surgery} onChange={setPatientField('surgery')} />
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label htmlFor="h-name">다니는 병원</label>
            <input id="h-name" value={hospital.name} onChange={(e) => setHospital({ ...hospital, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="h-doctor">진료과</label>
            <input id="h-doctor" value={hospital.doctor} onChange={(e) => setHospital({ ...hospital, doctor: e.target.value })} />
          </div>
        </div>

        <h2 style={{ marginTop: 8 }}>보호자 연결</h2>
        <label htmlFor="g-phone">보호자 연락처 *</label>
        <input id="g-phone" value={guardian.phone} onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })} />
        <label className="checkbox-row" htmlFor="g-consent">
          <input
            id="g-consent"
            type="checkbox"
            checked={guardian.consent}
            onChange={(e) => setGuardian({ ...guardian, consent: e.target.checked })}
          />
          복약 상태 알림 수신에 동의합니다
        </label>
      </div>

      <button type="button" onClick={submit}>
        등록하고 시작하기
      </button>
    </div>
  )
}
