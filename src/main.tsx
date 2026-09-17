import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SubjectProvider } from './context/SubjectContext'
import { installBoardNavigation } from './boardNavigation'
import './styles.css'

installBoardNavigation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubjectProvider><App /></SubjectProvider>
  </StrictMode>,
)