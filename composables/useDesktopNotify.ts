type DesktopNotice = {
  title: string
  body: string
  tag?: string
  path?: string
}

let armed = false

/** OS notifications while the driver tab is open but not focused. */
export const useDesktopNotify = () => {
  const supported = () => import.meta.client && typeof Notification !== 'undefined'

  const request = () => {
    if (!supported()) return
    if (Notification.permission !== 'default') return
    Notification.requestPermission().catch(() => {})
  }

  const arm = () => {
    if (!import.meta.client || armed) return
    armed = true
    window.addEventListener('pointerdown', () => request(), { once: true })
  }

  const notify = (notice: DesktopNotice) => {
    if (!supported()) return
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return

    const card = new Notification(notice.title, {
      body: notice.body,
      icon: '/icons/icon-192.png',
      tag: notice.tag,
    })
    card.onclick = () => {
      window.focus()
      card.close()
      if (notice.path) navigateTo(notice.path)
    }
  }

  return { arm, notify }
}
