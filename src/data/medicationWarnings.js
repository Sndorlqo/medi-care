const MEDICATION_WARNINGS = [
  {
    pattern: /아토르바스타틴|리피토|atorvastatin|lipitor/i,
    message: '자몽이나 자몽주스는 피하고, 복용 가능 여부를 의사 또는 약사에게 확인하세요.',
    source: 'FDA, Grapefruit Juice and Some Drugs Do Not Mix',
    sourceUrl: 'https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix',
  },
  {
    pattern: /심바스타틴|simvastatin|조코/i,
    message: '자몽이나 자몽주스는 피하고, 복용 가능 여부를 의사 또는 약사에게 확인하세요.',
    source: 'FDA, Grapefruit Juice and Some Drugs Do Not Mix',
    sourceUrl: 'https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix',
  },
  {
    pattern: /니페디핀|nifedipine|아달라트|프로카디아/i,
    message: '자몽이나 자몽주스는 피하세요. 혈압약의 작용이 달라질 수 있어요.',
    source: 'FDA, Grapefruit Juice and Some Drugs Do Not Mix',
    sourceUrl: 'https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix',
  },
  {
    pattern: /와파린|warfarin|쿠마딘/i,
    message: '비타민 K가 많은 녹색 채소 섭취량을 갑자기 바꾸지 말고, 의사와 상의하세요.',
    source: 'MedlinePlus, Warfarin',
    sourceUrl: 'https://medlineplus.gov/druginfo/meds/a682277.html',
  },
  {
    pattern: /레보티록신|levothyroxine|씬지로이드|신지로이드|신트로이드/i,
    message: '칼슘제나 철분제는 이 약과 4시간 이상 간격을 두세요.',
    source: 'MedlinePlus, Levothyroxine',
    sourceUrl: 'https://medlineplus.gov/druginfo/meds/a682461.html',
  },
]

export default MEDICATION_WARNINGS
