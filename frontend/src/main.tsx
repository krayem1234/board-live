import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BoardsPage from './pages/BoardsPage'
import BoardPage from './pages/BoardPage'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { ThemeProvider } from './lib/theme'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<Navigate to="/boards" replace />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="boards" element={<BoardsPage />} />
                <Route path="boards/:id" element={<BoardPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
