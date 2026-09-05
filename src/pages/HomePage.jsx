import { useData } from '../data/store.jsx'
import BigButton from '../components/BigButton.jsx'

export default function HomePage() {
  const { data } = useData()

  return (
    <div className="page">
      <h1>안녕하세요, {data.patient.name || '어르신'}님</h1>
      <p className="muted">오늘도 건강한 하루 되세요</p>
      <div className="stack">
        <BigButton to="/scan" icon="📷" label="약봉투/처방전 등록" />
        <BigButton to="/alarm" icon="🔔" label="복약 알람 & 체크" />
        <BigButton to="/drugs" icon="💊" label="등록된 약 목록" />
        <BigButton to="/hospitals" icon="🏥" label="인근 병원·약국 찾기" />
        <BigButton to="/guardian" icon="👨‍👩‍👦" label="보호자 화면 보기" variant="secondary" />
        <BigButton to="/settings" icon="⚙️" label="알람 시간 설정" variant="secondary" />
      </div>
    </div>
  )
}
