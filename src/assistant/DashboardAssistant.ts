import type { DashboardAction, DashboardAssistantInterface, DashboardCommand, SubjectId } from '../types/dashboard'

/** Navigation-only contract. Subject teachers never receive or execute these actions. */
export class DashboardAssistant implements DashboardAssistantInterface {
  constructor(private readonly onAction: (action: DashboardAction) => void) {}
  interpret(command: string): DashboardCommand | null {
    const normalized = command.toLowerCase()
    const subjects: [string, SubjectId][] = [['англий', 'english'], ['русск', 'russian'], ['математ', 'mathematics']]
    const subject = subjects.find(([word]) => normalized.includes(word))
    if (subject && (normalized.includes('переключ') || normalized.includes('давай'))) return { rawText: command, action: { type: 'switchSubject', subjectId: subject[1] } }
    const routes: [string, string][] = [['домашн', '/homework'], ['провероч', '/tests'], ['доск', '/board'], ['урок', '/lessons'], ['главн', '/dashboard']]
    const route = routes.find(([word]) => normalized.includes(word))
    return route ? { rawText: command, action: { type: 'navigate', route: route[1] } } : null
  }
  execute(action: DashboardAction) { this.onAction(action) }
}
