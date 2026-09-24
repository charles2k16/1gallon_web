type PaystackPopInstance = {
  resumeTransaction: (
    accessCode: string,
    callbacks?: {
      onSuccess?: (transaction: { reference?: string; message?: string }) => void
      onCancel?: () => void
      onError?: (error: { message?: string }) => void
    },
  ) => void
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance
  }
}

const INLINE_SRC = 'https://js.paystack.co/v2/inline.js'

let scriptPromise: Promise<void> | null = null

const loadPaystackScript = () => {
  if (!import.meta.client) return Promise.reject(new Error('Client only'))
  if (window.PaystackPop) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${INLINE_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Paystack script failed')))
      if (window.PaystackPop) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = INLINE_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Paystack script failed to load'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export type CheckoutResult = {
  paid: boolean
  cancelled?: boolean
  reference?: string
  error?: string
}

/**
 * Open Paystack checkout as an in-page popup (no full-page redirect),
 * matching the Flutter PaystackCheckoutSheet UX.
 */
export const openPaystackPopup = async (opts: {
  accessCode: string
  reference: string
}): Promise<CheckoutResult> => {
  await loadPaystackScript()
  if (!window.PaystackPop) {
    throw new Error('Paystack checkout unavailable')
  }

  return new Promise((resolve) => {
    const popup = new window.PaystackPop!()
    popup.resumeTransaction(opts.accessCode, {
      onSuccess: (tx) => {
        resolve({
          paid: true,
          reference: tx?.reference || opts.reference,
        })
      },
      onCancel: () => {
        resolve({ paid: false, cancelled: true, reference: opts.reference })
      },
      onError: (err) => {
        resolve({
          paid: false,
          reference: opts.reference,
          error: err?.message || 'Payment failed',
        })
      },
    })
  })
}
