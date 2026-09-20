import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'

export default function LoginPage() {
  const { data, update } = useData()
  const navigate = useNavigate()
  const [phone, setPhone] = useState(data.patient.phone || '')
  const [error, setError] = useState('')

  const login = () => {
    const savedPhone = data.patient.phone.replace(/\D/g, '')
    const enteredPhone = phone.replace(/\D/g, '')
    if (savedPhone && enteredPhone !== savedPhone) {
      setError('등록된 연락처와 일치하지 않아요.')
      return
    }

    if (!data.patient.name) {
      update({ patient: { ...data.patient, name: '어르신' } })
    }
    navigate(data.onboarded ? '/home' : '/onboarding')
  }

  return (
    <div className="page login-page">
      <span className="brand-logo">♥</span>
      <h1>실버케어</h1>
      <p className="muted">매일의 약, 가족과 함께 안심하고 챙겨요</p>

      <div className="stack" style={{ marginTop: 32 }}>
        <label htmlFor="login-phone">휴대폰 번호</label>
        <input
          id="login-phone"
          type="tel"
          value={phone}
          placeholder="010-0000-0000"
          onChange={(event) => {
            setPhone(event.target.value)
            setError('')
          }}
        />
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="button" onClick={login}>
          간편 로그인
        </button>
        <p className="muted">
          처음이신가요?{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate(data.onboarded ? '/home' : '/onboarding')}
          >
            회원가입
          </button>
        </p>
      </div>
    </div>
  )
}
