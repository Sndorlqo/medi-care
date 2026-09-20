// ponytail: no free map API (Kakao/Naver) exposes real-time open/closed/break status,
// so this estimates from typical Korean clinic/pharmacy hours. Swap for a real data
// source (e.g. Google Places opening_hours) if accuracy ever matters more than "roughly right".
const HOURS = {
  병원: { weekdayOpen: 9 * 60, weekdayClose: 18 * 60, satOpen: 9 * 60, satClose: 13 * 60, breakStart: 13 * 60, breakEnd: 14 * 60 },
  약국: { weekdayOpen: 9 * 60, weekdayClose: 20 * 60, satOpen: 9 * 60, satClose: 19 * 60 },
}

export function estimateBusinessStatus(type, now = new Date()) {
  const hours = HOURS[type] ?? HOURS.병원
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()

  if (day === 0) return { label: '영업종료 (일요일 추정)', tone: 'closed' }

  const isSaturday = day === 6
  const open = isSaturday ? hours.satOpen : hours.weekdayOpen
  const close = isSaturday ? hours.satClose : hours.weekdayClose

  if (minutes < open || minutes >= close) return { label: '영업종료 (추정)', tone: 'closed' }
  if (!isSaturday && hours.breakStart && minutes >= hours.breakStart && minutes < hours.breakEnd) {
    return { label: '휴게시간 (추정)', tone: 'break' }
  }
  return { label: '영업중 (추정)', tone: 'open' }
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`
}
