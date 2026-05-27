import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/UI'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute({ children }) {
  const { session, loading, enabled } = useAuth()
  const location = useLocation()

  if (!enabled) return children
  if (loading) return <Spinner size={24} />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />

  return children
}
