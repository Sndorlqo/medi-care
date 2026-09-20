import { OCR_MULTI_SAMPLE, OCR_SAMPLES } from './seed.js'

export function mockOcrScan(sampleKey) {
  const sample = sampleKey === OCR_MULTI_SAMPLE.key
    ? OCR_MULTI_SAMPLE
    : (
    OCR_SAMPLES.find((s) => s.key === sampleKey) ??
    OCR_SAMPLES[Math.floor(Math.random() * OCR_SAMPLES.length)]
    )

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        confidence: sample.confidence,
        fields: sample.fields ? { ...sample.fields, times: [...sample.fields.times] } : null,
        medications: sample.medications?.map((medication) => ({
          ...medication,
          times: [...medication.times],
        })),
      })
    }, 1200)
  })
}
