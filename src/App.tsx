import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Lightbulb,
  MoreHorizontal,
  PencilLine,
  Sparkles,
  Volume2,
} from 'lucide-react'

const answers = [
  { value: 15, label: '15 минут' },
  { value: 20, label: '20 минут' },
  { value: 25, label: '25 минут' },
  { value: 30, label: '30 минут' },
]

function App() {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const isCorrect = checked && selected === 20

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/lesson" aria-label="Математика с Соломоном">
          <span className="brand-mark"><Sparkles size={21} /></span>
          <span>Математика <em>с Соломоном</em></span>
        </a>
        <div className="lesson-progress" aria-label="Прогресс урока: 3 из 8">
          <span>Урок 4</span>
          <div className="progress-track"><div className="progress-value" /></div>
          <span>3 из 8</span>
        </div>
        <div className="streak"><Flame size={18} fill="currentColor" /> <strong>7</strong><span>дней подряд</span></div>
        <button className="icon-button" aria-label="Дополнительное меню"><MoreHorizontal /></button>
      </header>

      <main>
        <section className="lesson-heading">
          <a href="/" className="back-link"><ArrowLeft size={17} /> Все уроки</a>
          <div className="eyebrow"><span>ТЕМА 2</span> · ДРОБИ И ВРЕМЯ</div>
          <h1>Как найти часть от целого?</h1>
          <p>Сегодня научимся видеть дроби в обычных ситуациях</p>
        </section>

        <div className="lesson-layout">
          <aside className="tutor-card">
            <div className="portrait" aria-hidden="true">
              <div className="portrait-hair" />
              <div className="portrait-face">
                <span className="eye left" /><span className="eye right" />
                <span className="glasses left" /><span className="glasses right" />
                <span className="nose" /><span className="moustache">⌁</span>
              </div>
              <div className="portrait-body"><span className="bowtie">◆</span></div>
            </div>
            <div className="tutor-name">Соломон Борисович</div>
            <div className="tutor-role">твой преподаватель</div>
            <blockquote>
              «Не спеши считать. Сначала представь, что происходит!»
            </blockquote>
            <button className="listen-button"><Volume2 size={18} /> Послушать условие</button>
          </aside>

          <section className="task-card">
            <div className="task-number">ЗАДАНИЕ 3</div>
            <div className="difficulty"><span>●</span><span>●</span><span>●</span><b>СРЕДНЕЕ</b></div>
            <h2>Разминка перед прогулкой</h2>
            <p className="problem">
              Иосиф гулял в парке <strong>1 час</strong>. Первую <span className="fraction"><i>1</i><i>3</i></span> времени он катался на самокате, а остальное время кормил уток.
            </p>
            <div className="question">Сколько минут Иосиф катался на самокате?</div>

            <div className="visual-equation" aria-label="Один час разделён на три равные части">
              <div className="clock">
                <div className="clock-hand" />
                <span>60</span><small>минут</small>
              </div>
              <ArrowRight className="equation-arrow" />
              <div className="thirds">
                {[1, 2, 3].map((part) => <div key={part} className={part === 1 ? 'active' : ''}>?</div>)}
                <small>3 равные части</small>
              </div>
            </div>

            <div className="answer-title">Выбери ответ</div>
            <div className="answers">
              {answers.map((answer) => (
                <button
                  key={answer.value}
                  className={`answer ${selected === answer.value ? 'selected' : ''} ${checked && selected === answer.value ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                  onClick={() => { setSelected(answer.value); setChecked(false) }}
                >
                  <span className="radio">{selected === answer.value && <span />}</span>
                  {answer.label}
                  {checked && selected === answer.value && isCorrect && <Check size={18} />}
                </button>
              ))}
            </div>

            {showHint && <div className="hint"><Lightbulb size={18} /> В одном часе 60 минут. Раздели 60 на 3 равные части.</div>}
            {checked && !isCorrect && <div className="feedback error">Почти! Вспомни, сколько минут в одном часе, и попробуй разделить их поровну.</div>}
            {isCorrect && <div className="feedback success">Верно! 60 ÷ 3 = 20 минут. Отличная работа!</div>}

            <div className="actions">
              <button className="hint-button" onClick={() => setShowHint((value) => !value)}><Lightbulb size={18} /> {showHint ? 'Скрыть подсказку' : 'Нужна подсказка?'}</button>
              <button className="check-button" disabled={selected === null} onClick={() => setChecked(true)}>{isCorrect ? 'Продолжить' : 'Проверить'} <ArrowRight size={18} /></button>
            </div>
          </section>

          <aside className="notes-card">
            <div className="notes-heading"><PencilLine size={18} /><span><strong>Черновик</strong><small>Решай здесь как удобно</small></span></div>
            <textarea aria-label="Черновик для решения" placeholder={'60 минут\n\n1/3 — это...'} />
            <div className="notes-tip"><BookOpen size={17} /> Можно записать действие или нарисовать схему</div>
          </aside>
        </div>
      </main>

      <footer><span>© 2026 Математика с Соломоном</span><span>Ошибаться — это часть учёбы 🌱</span><a href="/help">Помощь</a></footer>
    </div>
  )
}

export default App
