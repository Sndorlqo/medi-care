import { INTERACTION_RULES, CARE_RULES } from './seed.js'

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
  return drug.tags.map((tag) => CARE_RULES[tag]).filter(Boolean)
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
