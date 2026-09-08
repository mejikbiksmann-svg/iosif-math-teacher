import type { BoardContext, Homework, LessonRecord, SubjectId, SubjectTeacherConfig, WeeklyAssessment } from '../../types/dashboard'

export const subjectLabels: Record<SubjectId, string> = { mathematics: 'Математика', english: 'Английский язык', russian: 'Русский язык' }
export const teachers: Record<SubjectId, SubjectTeacherConfig> = {
  mathematics: { subjectId: 'mathematics', teacherId: 'solomon', displayName: 'Соломон Борисович', avatarPlaceholder: 'СБ', teacherProfileId: 'teacher-solomon' },
  english: { subjectId: 'english', teacherId: 'english-placeholder', displayName: 'Преподаватель английского', avatarPlaceholder: 'EN', teacherProfileId: 'teacher-english-placeholder' },
  russian: { subjectId: 'russian', teacherId: 'russian-placeholder', displayName: 'Преподаватель русского', avatarPlaceholder: 'РУ', teacherProfileId: 'teacher-russian-placeholder' },
}

const info = {
  mathematics: { topics: ['Сложение и вычитание в пределах 100', 'Задачи на время', 'Геометрические фигуры'], learned: ['Устный счёт', 'Проверка результата обратным действием'], tasks: ['Решить 48 + 27', 'Найти неизвестное слагаемое'], examples: ['48 + 27 = 75', '75 − 27 = 48'] },
  english: { topics: ['My day: распорядок дня', 'Present Simple', 'Слова о школе'], learned: ['Новые слова о распорядке дня', 'Утвердительные предложения'], tasks: ['Составить 5 предложений', 'Соединить слова и картинки'], examples: ['I wake up at seven.', 'I go to school.'] },
  russian: { topics: ['Главные члены предложения', 'Безударные гласные', 'Состав слова'], learned: ['Находить подлежащее', 'Находить сказуемое'], tasks: ['Подчеркнуть главные члены', 'Составить предложение'], examples: ['Птицы летят.', 'Иосиф читает книгу.'] },
} satisfies Record<SubjectId, { topics: string[]; learned: string[]; tasks: string[]; examples: string[] }>

const dates = ['2026-08-25', '2026-09-01', '2026-09-08', '2026-09-15']
export const lessons = (Object.keys(info) as SubjectId[]).flatMap((subjectId) => dates.map((date, i): LessonRecord => ({
  id: `${subjectId}-lesson-${i + 1}`, subjectId, date, time: i % 2 ? '16:30' : '17:00', topic: info[subjectId].topics[i % 3],
  teacherId: teachers[subjectId].teacherId, status: i < 2 ? 'completed' : 'upcoming',
  summary: `Разобрали тему «${info[subjectId].topics[i % 3]}» и закрепили её на практике.`, learned: info[subjectId].learned,
  assignments: info[subjectId].tasks, examples: info[subjectId].examples, studentAnswers: i < 2 ? ['Ответ дан самостоятельно', 'Ответ исправлен после подсказки'] : [],
  materials: ['Памятка по теме', 'Рабочий лист урока'], teacherNotes: 'Иосиф внимательно работал и уверенно применил новый способ.', repeat: ['Повторить правило', 'Решить два похожих задания'],
})))

export const assessments = (Object.keys(info) as SubjectId[]).flatMap((subjectId) => [0, 1].map((i): WeeklyAssessment => ({
  id: `${subjectId}-assessment-${i + 1}`, subjectId, date: i ? '2026-09-11' : '2026-09-04', weekId: `2026-W${i ? 37 : 36}`,
  title: i ? 'Проверочная работа за текущую неделю' : 'Проверочная работа за неделю', topicIds: [info[subjectId].topics[i]],
  exercises: info[subjectId].tasks, studentAnswers: i ? [] : ['Верный ответ', 'Ответ с неточностью'], correctSolutions: info[subjectId].examples,
  score: i ? undefined : 8, total: 10, percentage: i ? undefined : 80, mistakes: i ? [] : ['Невнимательно прочитано второе условие'],
  teacherSummary: i ? 'Работа станет доступна в пятницу.' : 'Материал недели усвоен хорошо.', recommendations: ['Повторить отмеченное правило'], completedAt: i ? undefined : '2026-09-04T17:20:00Z',
})))

export const homework = (Object.keys(info) as SubjectId[]).flatMap((subjectId) => [0, 1].map((i): Homework => ({
  id: `${subjectId}-homework-${i + 1}`, subjectId, title: i ? `Домашняя работа: ${info[subjectId].topics[0]}` : `Повторение: ${info[subjectId].topics[1]}`,
  dueDate: i ? '2026-09-14' : '2026-09-02', lessonId: `${subjectId}-lesson-${i + 1}`, tasks: info[subjectId].tasks,
  status: i ? 'in-progress' : 'reviewed', studentWork: i ? undefined : info[subjectId].examples, result: i ? undefined : 'Выполнено верно: 4 из 5',
  teacherComment: i ? undefined : 'Хорошая самостоятельная работа. Проверь последнее задание ещё раз.',
})))

export const progress = {
  mathematics: { topic: info.mathematics.topics[0], done: 4, total: 7, trend: '+12%', strengths: 'Устный счёт', attention: 'Текстовые задачи', independence: '76%', hints: 3 },
  english: { topic: info.english.topics[0], done: 3, total: 6, trend: '+9%', strengths: 'Новые слова', attention: 'Порядок слов', independence: '70%', hints: 4 },
  russian: { topic: info.russian.topics[0], done: 5, total: 8, trend: '+10%', strengths: 'Части речи', attention: 'Безударные гласные', independence: '73%', hints: 3 },
} satisfies Record<SubjectId, { topic: string; done: number; total: number; trend: string; strengths: string; attention: string; independence: string; hints: number }>

export const achievements: Record<SubjectId, string[]> = {
  mathematics: ['7 уроков без пропусков', '5 задач подряд без подсказки', 'Тема освоена', 'Отличная проверочная'],
  english: ['Словарь недели собран', '3 урока без пропусков', 'Диалог прочитан самостоятельно', 'Хорошая проверочная'],
  russian: ['Правило применено без подсказки', '4 урока без пропусков', 'Аккуратная письменная работа', 'Тема освоена'],
}
export const library: Record<SubjectId, string[]> = {
  mathematics: ['Памятка: сложение столбиком', 'Схемы к задачам', 'Рабочие листы прошлых уроков'],
  english: ['Карточки My day', 'Текст для чтения', 'Список слов недели', 'Аудиоматериалы — скоро'],
  russian: ['Правило о главных членах', 'Тексты для чтения', 'Упражнения на гласные'],
}
export const boards: Record<SubjectId, BoardContext> = {
  mathematics: { subjectId: 'mathematics', mode: 'math', tools: ['Свободное рисование', 'Фигуры', 'Вычисления', 'Схемы'] },
  english: { subjectId: 'english', mode: 'english', tools: ['Слова', 'Фразы', 'Упражнения', 'Визуальные материалы'] },
  russian: { subjectId: 'russian', mode: 'russian', tools: ['Текст', 'Предложения', 'Разбор слов', 'Письмо'] },
}
