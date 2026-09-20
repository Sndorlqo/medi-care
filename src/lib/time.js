export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isSlotDue(slot, alarmTimes, logs) {
  const already = logs.some(
    (l) => l.slot === slot && l.date === todayStr() && l.status !== 'pending',
  )
  if (already) return false
  return nowHHMM() >= alarmTimes[slot]
}

export function formatAmPmTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? '오전' : '오후'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`
}

export function formatKoreanDate(date = new Date()) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`
}
