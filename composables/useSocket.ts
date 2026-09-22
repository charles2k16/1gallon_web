import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const { base, token } = useApi()
  const connected = useState('socket_connected', () => false)

  const connect = () => {
    if (!import.meta.client || !token.value) return null
    if (socket?.connected) return socket

    if (socket) {
      socket.disconnect()
      socket = null
    }

    socket = io(base, {
      auth: { token: token.value },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socket.on('connect', () => {
      connected.value = true
    })
    socket.on('disconnect', () => {
      connected.value = false
    })

    return socket
  }

  const getSocket = () => {
    if (!socket || !socket.connected) return connect()
    return socket
  }

  const on = (event: string, handler: (...args: any[]) => void) => {
    const s = getSocket()
    s?.on(event, handler)
    return () => s?.off(event, handler)
  }

  const emit = (event: string, payload?: any) => {
    getSocket()?.emit(event, payload)
  }

  const disconnect = () => {
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  return { connect, getSocket, on, emit, disconnect, connected }
}
