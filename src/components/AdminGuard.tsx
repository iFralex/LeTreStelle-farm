import { Navigate, Outlet } from 'react-router-dom'

export default function AdminGuard() {
  const isAuthed = sessionStorage.getItem('adminAuth') === 'true'
  return isAuthed ? <Outlet /> : <Navigate to="/admin" replace />
}
