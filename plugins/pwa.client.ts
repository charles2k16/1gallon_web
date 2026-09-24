export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return

  const deferred = useState<any>('pwa_install', () => null)

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault()
    deferred.value = event
  })

  window.addEventListener('appinstalled', () => {
    deferred.value = null
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
})
