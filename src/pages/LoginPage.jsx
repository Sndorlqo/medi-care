import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'

export default function LoginPage() {
  const { data, update } = useData()
  const navigate = useNavigate()

  const login = () => {
    if (!data.patient.name) {
      update({ patient: { ...data.patient, name: '어르신' } })
    }
    navigate(data.onboarded ? '/home' : '/onboarding')
  }

  return (
    <div className="page" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>💊</div>
      <h1>실버 Care</h1>
      <p className="muted">약 복용, 잊지 않도록 도와드릴게요</p>
      <div className="stack" style={{ marginTop: 32 }}>
        <button type="button" onClick={login}>
          📱 전화번호로 시작하기
        </button>
        <button type="button" className="secondary" onClick={login}>
          카카오로 시작하기
        </button>
        <button type="button" className="secondary" onClick={login}>
          네이버로 시작하기
        </button>
      </div>
    </div>
  )
}
