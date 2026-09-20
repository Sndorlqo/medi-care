import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { startKakaoLogin, exchangeKakaoCode } from '../lib/kakaoAuth.js'

export default function LoginPage() {
  const { data, update } = useData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [phone, setPhone] = useState(data.patient.phone || '')
  const [error, setError] = useState('')
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const exchangedCodeRef = useRef(null)

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

  // Kakao redirects back here with ?code=... after the user approves login.
  // Kakao's authorization code is single-use, so a StrictMode double-invoke
  // of this effect must not exchange it twice — guard with a ref.
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code || exchangedCodeRef.current === code) return
    exchangedCodeRef.current = code
    setKakaoLoading(true)
    exchangeKakaoCode(code)
      .then((nickname) => {
        if (nickname) update({ patient: { ...data.patient, name: nickname } })
        navigate(data.onboarded ? '/home' : '/onboarding')
      })
      .catch(() => {
        setError('카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
        setSearchParams({}, { replace: true })
      })
      .finally(() => setKakaoLoading(false))
    // Only run once, when the redirect first lands with a code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const kakaoLogin = async () => {
    setError('')
    setKakaoLoading(true)
    try {
      await startKakaoLogin(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY)
    } catch {
      setError('카카오 로그인을 시작하지 못했어요.')
      setKakaoLoading(false)
    }
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
        <p className="muted">또는</p>
        <button type="button" className="secondary" onClick={kakaoLogin} disabled={kakaoLoading}>
          {kakaoLoading ? '카카오 로그인 중...' : '카카오로 계속하기'}
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
