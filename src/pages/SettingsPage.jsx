import { useData } from '../data/store.jsx'
import { SLOTS } from '../data/seed.js'

export default function SettingsPage() {
  const { data, setAlarmTime } = useData()

  return (
    <div className="page">
      <h1>알람 시간 설정</h1>
      <div className="card stack">
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
    </div>
  )
}
