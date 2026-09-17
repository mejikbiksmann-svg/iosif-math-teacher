import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SubjectProvider } from './context/SubjectContext'
import { installBoardViewportPan } from './boardViewportPan'
import './styles.css'

installBoardViewportPan()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubjectProvider><App /></SubjectProvider>
  </StrictMode>,
)
