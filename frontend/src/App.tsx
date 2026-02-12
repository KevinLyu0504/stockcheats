import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ROUTE_PATHS } from './constants'

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))

function PageFallback() {
  return (
    <div className="w-screen h-screen bg-[#0A0A0A] flex items-center justify-center text-white/60">
      加载中...
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />
              <Route path={ROUTE_PATHS.REGISTER} element={<Register />} />
              <Route
                path={ROUTE_PATHS.DASHBOARD}
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
