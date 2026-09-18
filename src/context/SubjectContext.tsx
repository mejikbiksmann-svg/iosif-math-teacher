import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { teachers } from '../data/mock/dashboardData'
import type { AppState, SubjectId } from '../types/dashboard'

interface SubjectContextValue { state: AppState; selectedSubject: SubjectId; setSelectedSubject: (subject: SubjectId) => void }
const SubjectContext = createContext<SubjectContextValue | null>(null)

export function SubjectProvider({ children }: { children: ReactNode }) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(() => (localStorage.getItem('selectedSubject') as SubjectId) || 'mathematics')
  const select = (subject: SubjectId) => { localStorage.setItem('selectedSubject', subject); setSelectedSubject(subject) }
  const state = useMemo<AppState>(() => ({ selectedSubject, currentRoute: window.location.pathname, activeTeacher: teachers[selectedSubject] }), [selectedSubject])
  return <SubjectContext.Provider value={{ state, selectedSubject, setSelectedSubject: select }}>{children}</SubjectContext.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useSubject() { const value = useContext(SubjectContext); if (!value) throw new Error('useSubject must be used inside SubjectProvider'); return value }
