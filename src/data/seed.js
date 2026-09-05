export const SLOTS = ['아침', '점심', '저녁', '자기전']

export const INTERACTION_RULES = [
  {
    tags: ['항응고제', '항응고제유사'],
    message: '출혈 위험이 높아질 수 있어 병용에 주의가 필요합니다.',
    severity: 'high',
  },
  {
    tags: ['자몽금기', '항응고제'],
    message: '자몽 성분이 약효를 과도하게 높일 수 있습니다.',
    severity: 'medium',
  },
]

export const CARE_RULES = {
  항응고제: '식후 30분 이내 복용',
  항응고제유사: '다른 혈액관련 약과 함께 복용 시 의사와 상의',
  자몽금기: '자몽 주스와 함께 복용 금지',
  유제품간격: '유제품과 2시간 이상 간격 두기',
}

export const OCR_SAMPLES = [
  {
    key: 'warfarin',
    confidence: 0.92,
    fields: {
      name: '와파린정',
      dose: '1정',
      frequencyPerDay: 1,
      totalDays: 30,
      times: ['아침'],
      tags: ['항응고제'],
    },
  },
  {
    key: 'omega3',
    confidence: 0.5,
    fields: {
      name: '오메가3',
      dose: '1캡슐',
      frequencyPerDay: 2,
      totalDays: 60,
      times: ['아침', '저녁'],
      tags: ['항응고제유사'],
    },
  },
  {
    key: 'lipitor',
    confidence: 0.88,
    fields: {
      name: '리피토정',
      dose: '1정',
      frequencyPerDay: 1,
      totalDays: 90,
      times: ['자기전'],
      tags: ['자몽금기'],
    },
  },
  {
    key: 'calcium',
    confidence: 0.95,
    fields: {
      name: '칼슘제',
      dose: '1정',
      frequencyPerDay: 1,
      totalDays: 90,
      times: ['점심'],
      tags: ['유제품간격'],
    },
  },
]

export function emptyData() {
  return {
    onboarded: false,
    patient: { name: '', age: '', phone: '' },
    guardian: { name: '', phone: '' },
    hospital: null,
    drugs: [],
    alarmTimes: { 아침: '08:00', 점심: '12:30', 저녁: '18:30', 자기전: '22:00' },
    logs: [],
  }
}
