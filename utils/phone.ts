const LOCAL_RE = /^0(?:54|55|24|20|50|27)\d{7}$/

export const digitsOnly = (phone: string) => String(phone || '').replace(/\D/g, '')

/** Normalize to local Ghana format: 0541234567 */
export const toLocalGhanaPhone = (phone: string) => {
  let raw = String(phone || '')
    .trim()
    .replace(/[\s\-().]/g, '')
  if (raw.startsWith('+')) raw = raw.slice(1)

  let d = digitsOnly(raw)
  if (d.startsWith('233') && d.length === 12) {
    d = `0${d.slice(3)}`
  } else if (!d.startsWith('0') && d.length === 9) {
    d = `0${d}`
  }

  if (!LOCAL_RE.test(d)) {
    throw new Error('Enter a valid Ghana phone number (054, 055, 024, 020, 050, 027)')
  }
  return d
}

export const isValidGhanaPhone = (phone: string) => {
  try {
    toLocalGhanaPhone(phone)
    return true
  } catch {
    return false
  }
}
