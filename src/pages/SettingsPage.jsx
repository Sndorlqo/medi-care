import { useNavigate } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { SLOTS, emptyData } from '../data/seed.js'

export default function SettingsPage() {
  const { data, setAlarmTime, update } = useData()
  const navigate = useNavigate()

  const withdraw = () => {
    if (!window.confirm('탈퇴하면 등록된 약, 알람, 기록이 모두 삭제돼요. 계속할까요?')) return
    update(emptyData())
    navigate('/login')
  }

  return (
    <div className="page">
      <h1>설정</h1>

      <div className="card stack">
        <h2>알람 시간 설정</h2>
        {SLOTS.map((slot) => (
          <div key={slot}>
            <label htmlFor={`t-${slot}`}>{slot}</label>
            <input
              id={`t-${slot}`}
              type="time"
              value={data.alarmTimes[slot]}
              onChange={(e) => setAlarmTime(slot, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="card stack">
        <h2>계정</h2>
        <p className="muted">탈퇴하면 등록된 약, 알람 시간, 복약 기록이 모두 삭제되고 처음 화면으로 돌아가요.</p>
        <button type="button" className="danger" onClick={withdraw}>
          탈퇴하기
        </button>
      </div>
    </div>
  )
}
