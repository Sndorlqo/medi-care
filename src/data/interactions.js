import { INTERACTION_RULES, CARE_RULES } from './seed.js'
import MEDICATION_WARNINGS from './medicationWarnings.js'

export function checkInteractions(newDrug, existingDrugs) {
  const warnings = []
  for (const existing of existingDrugs) {
    for (const rule of INTERACTION_RULES) {
      const hasNew = newDrug.tags.some((t) => rule.tags.includes(t))
      const hasExisting = existing.tags.some((t) => rule.tags.includes(t))
      if (hasNew && hasExisting) {
        warnings.push({
          withDrugName: existing.name,
          message: rule.message,
          severity: rule.severity,
        })
      }
    }
  }
  return warnings
}

export function getCareInstructions(drug) {
  const tags = Array.isArray(drug.tags) ? drug.tags : []
  const tagInstructions = tags.map((tag) => CARE_RULES[tag]).filter(Boolean)
  const externalInstructions = MEDICATION_WARNINGS
    .filter((warning) => warning.pattern.test(drug.name ?? ''))
    .map((warning) => warning.message)
  return [...new Set([...tagInstructions, ...externalInstructions])]
}

export function getMedicationWarningSources(drug) {
  const curatedSources = MEDICATION_WARNINGS
    .filter((warning) => warning.pattern.test(drug.name ?? ''))
    .map(({ source, sourceUrl }) => ({ source, sourceUrl }))
  const apiSource = drug.medicineInfo?.source && drug.medicineInfo.sourceUrl
    ? [{ source: drug.medicineInfo.source, sourceUrl: drug.medicineInfo.sourceUrl }]
    : []
  return [...new Map([...curatedSources, ...apiSource].map((source) => [source.sourceUrl, source])).values()]
}

export function getMedicineApiInstructions(medicine) {
  if (!medicine) return []
  return [medicine.atpnWarnQesitm, medicine.atpnQesitm, medicine.intrcQesitm]
    .filter(Boolean)
    .map((text) => text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function summarizeCareInstruction(instruction) {
  const cleanInstruction = instruction.replace(/\s+/g, ' ').trim()
  const firstSentence = cleanInstruction.split(/(?<=[.!?])\s+/)[0]
  if (firstSentence.length <= 110) return firstSentence
  return `${firstSentence.slice(0, 107).replace(/\s+\S*$/, '')}...`
}

console.assert(
  checkInteractions(
    { name: '와파린정', tags: ['항응고제'] },
    [{ name: '오메가3', tags: ['항응고제유사'] }],
  ).length === 1,
  'checkInteractions should flag 항응고제 x 항응고제유사',
)
console.assert(
  checkInteractions({ name: '칼슘제', tags: ['유제품간격'] }, [
    { name: '와파린정', tags: ['항응고제'] },
  ]).length === 0,
  'checkInteractions should not flag unrelated tags',
)
console.assert(
  getCareInstructions({ tags: ['자몽금기', '유제품간격'] }).length === 2,
  'getCareInstructions should map every tag with a rule',
)
