import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  socket = io(url, {
    auth: { token },
    transports: ['websocket'],
  })
  return socket
}
