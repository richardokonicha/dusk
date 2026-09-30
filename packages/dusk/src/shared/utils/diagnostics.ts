/**
 * Where "Manual feedback" sends users. This must stay on infrastructure the
 * Dusk project controls — do not point it at a third-party or CN-hosted form.
 * Prefilled via query params so the link stays self-contained.
 */
export const DIAGNOSTIC_FEEDBACK_FORM_URL =
  'https://github.com/richardokonicha/dusk/issues/new?title=%5BDiagnostic%5D%20Report&labels=diagnostic&body=' +
  'Paste the diagnostic report bundle contents here.\n'

export const DIAGNOSTIC_DESCRIPTION_MAX_BYTES = 4096

export function normalizeDiagnosticDescription(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '\r\n')
}

export function diagnosticDescriptionByteLength(value: string): number {
  return new TextEncoder().encode(normalizeDiagnosticDescription(value)).byteLength
}
