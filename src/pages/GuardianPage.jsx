import { Link } from 'react-router-dom'
import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'
import { todayStr } from '../lib/time.js'

const STATUS_LABEL = { taken: '먹었어요 ✅', skipped: '안먹음 ⚠️', pending: '대기중' }

export default function GuardianPage() {
  const { data } = useData()

  const statusFor = (slot) =>
    data.logs.find((l) => l.slot === slot && l.date === todayStr())?.status ?? 'pending'

  return (
    <div className="page">
      <h1>👨‍👩‍👦 보호자 화면</h1>
      <p className="muted">
        {data.patient.name || '어르신'}님의 오늘({todayStr()}) 복약 현황
      </p>

      <div className="stack">
        {SLOTS.map((slot) => {
          const drugs = data.drugs.filter((d) => d.times.includes(slot))
          const status = statusFor(slot)
          return (
            <div key={slot} className="card row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>{slot}</h2>
                <p className="muted">{drugs.length ? drugs.map((d) => d.name).join(', ') : '등록된 약 없음'}</p>
              </div>
              <span
                className="badge"
                style={
                  status === 'skipped'
                    ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
                    : undefined
                }
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
          )
        })}
      </div>

      <Link to="/home" className="button secondary">
        환자 화면으로 돌아가기
      </Link>
    </div>
  )
}
