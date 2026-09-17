import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SubjectProvider } from './context/SubjectContext'
import { installPointerDiagnostics } from './pointerDiagnostics'
import './styles.css'

installPointerDiagnostics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubjectProvider><App /></SubjectProvider>
  </StrictMode>,
)
