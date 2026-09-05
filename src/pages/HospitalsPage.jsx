import { useState } from 'react'

const PLACES = [
  { name: '행복내과의원', address: '서울시 중구 세종대로 10', phone: '02-1234-5678', open: true },
  { name: '365 온누리약국', address: '서울시 중구 명동길 20', phone: '02-2345-6789', open: true },
  { name: '연세정형외과', address: '서울시 중구 을지로 30', phone: '02-3456-7890', open: false },
  { name: '햇살약국', address: '서울시 중구 퇴계로 15', phone: '02-4567-8901', open: true },
]

export default function HospitalsPage() {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState(null)

  const findMe = () => {
    if (!('geolocation' in navigator)) {
      setError('이 기기에서는 위치 확인을 지원하지 않아요.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(pos.coords),
      () => setError('위치 확인 권한이 필요해요.'),
    )
  }

  return (
    <div className="page">
      <h1>🏥 인근 병원·약국</h1>
      <button type="button" className="secondary" onClick={findMe}>
        📍 내 위치 확인하기
      </button>
      {coords && (
        <p className="muted">
          현재 위치: 위도 {coords.latitude.toFixed(4)}, 경도 {coords.longitude.toFixed(4)}
        </p>
      )}
      {error && <p className="muted">{error}</p>}

      <div className="stack">
        {PLACES.map((p) => (
          <div key={p.name} className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{p.name}</h2>
              <span
                className="badge"
                style={!p.open ? { background: 'var(--danger-bg)', color: 'var(--danger)' } : undefined}
              >
                {p.open ? '영업중' : '영업종료'}
              </span>
            </div>
            <p className="muted">{p.address}</p>
            <p className="muted">{p.phone}</p>
            <a
              className="button secondary"
              style={{ marginTop: 8 }}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noreferrer"
            >
              길찾기
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
