import { OCR_SAMPLES } from './seed.js'

export function mockOcrScan(sampleKey) {
  const sample =
    OCR_SAMPLES.find((s) => s.key === sampleKey) ??
    OCR_SAMPLES[Math.floor(Math.random() * OCR_SAMPLES.length)]

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ confidence: sample.confidence, fields: { ...sample.fields, times: [...sample.fields.times] } })
    }, 1200)
  })
}
