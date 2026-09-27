export type SubjectId = 'mathematics' | 'english' | 'russian'
export type LessonStatus = 'upcoming' | 'completed' | 'in-progress'
export type HomeworkStatus = 'not-started' | 'in-progress' | 'completed' | 'reviewed'

export interface SubjectTeacherConfig {
  subjectId: SubjectId
  teacherId: string
  displayName: string
  avatarPlaceholder: string
  teacherProfileId: string
}

export interface LessonRecord {
  id: string; subjectId: SubjectId; date: string; time: string; topic: string
  teacherId: string; status: LessonStatus; summary: string; learned: string[]
  assignments: string[]; examples: string[]; studentAnswers: string[]
  materials: string[]; teacherNotes: string; repeat: string[]
}

export interface WeeklyAssessment {
  id: string; subjectId: SubjectId; date: string; weekId: string; title: string
  topicIds: string[]; exercises: string[]; studentAnswers: string[]; correctSolutions: string[]
  score?: number; total: number; percentage?: number; mistakes: string[]
  teacherSummary: string; recommendations: string[]; completedAt?: string
}

export interface Homework {
  id: string; subjectId: SubjectId; title: string; dueDate: string; lessonId: string
  tasks: string[]; status: HomeworkStatus; studentWork?: string[]; result?: string; teacherComment?: string
}

export type BoardMode = 'math' | 'english' | 'russian'
export interface BoardContext { subjectId: SubjectId; mode: BoardMode; tools: string[] }

export type DashboardAction =
  | { type: 'navigate'; route: string }
  | { type: 'switchSubject'; subjectId: SubjectId }
  | { type: 'openLesson'; lessonId: string }
  | { type: 'openHomework'; homeworkId?: string }
  | { type: 'openAssessment'; assessmentId?: string }

export interface DashboardCommand { rawText: string; action: DashboardAction }
export interface DashboardAssistantInterface {
  interpret(command: string): DashboardCommand | null
  execute(action: DashboardAction): void
}

export interface AppState {
  selectedSubject: SubjectId
  currentRoute: string
  activeTeacher: SubjectTeacherConfig
  activeLesson?: string
  activeHomework?: string
  activeAssessment?: string
}
