export type QuoteParams = {
  stationId: string
  fuelType: string
  litres?: number
  amount?: number
  deliveryLat: number
  deliveryLng: number
}

export const useQuote = () => {
  const { get } = useApi()
  const quote = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchQuote = async (params: QuoteParams) => {
    loading.value = true
    error.value = null
    try {
      const res = await get('/catalog/quote', params as any)
      quote.value = res.data?.quote || res.data || res.quote || res
      return quote.value
    } catch (e: any) {
      error.value = e.message
      quote.value = null
      throw e
    } finally {
      loading.value = false
    }
  }

  return { quote, loading, error, fetchQuote }
}
