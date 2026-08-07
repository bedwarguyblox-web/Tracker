import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bell, BookOpen, Check, ChevronDown, CircleHelp, ClipboardList, Clock3, Filter, History, ListFilter, Menu, Moon, Pencil, Pin, PinOff, Plus, Search, Settings, Sun, Trash2, X } from 'lucide-react';
import { Route, Switch, Router as WouterRouter } from 'wouter';

type Priority = 'low' | 'medium' | 'high';
type Tab = 'active' | 'history';
type Deadline = {
  id: string;
  title: string;
  subject: string;
  activity: string;
  dueDate: string;
  priority: Priority;
  pinned: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

const STORAGE_KEY = 'mrc-deadlines-v1';
const THEME_KEY = 'mrc-theme';
const today = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (offset = 0) => {
  const value = new Date(today);
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};
const readableDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
const relativeDue = (date: string) => {
  const delta = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${localDate()}T12:00:00`).getTime()) / 86400000);
  if (delta < 0) return `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} overdue`;
  if (delta === 0) return 'Due today';
  if (delta === 1) return 'Due tomorrow';
  return `Due in ${delta} days`;
};

const demoDeadlines: Deadline[] = [
  { id: 'bio-essay', title: 'Cellular Respiration Essay', subject: 'Biology', activity: 'Write-up · 1,200 words', dueDate: localDate(0), priority: 'high', pinned: true, completed: false, createdAt: localDate(-8) },
  { id: 'lit-reading', title: 'The Waste Land — close reading', subject: 'English Literature', activity: 'Read pp. 42–67 and annotate', dueDate: localDate(1), priority: 'medium', pinned: false, completed: false, createdAt: localDate(-6) },
  { id: 'stats-problem', title: 'Probability problem set 04', subject: 'Mathematics', activity: 'Problems 1–12 · show working', dueDate: localDate(3), priority: 'medium', pinned: false, completed: false, createdAt: localDate(-4) },
  { id: 'history-source', title: 'Primary source commentary', subject: 'Modern History', activity: 'Draft thesis + source notes', dueDate: localDate(-1), priority: 'high', pinned: false, completed: false, createdAt: localDate(-11) },
  { id: 'chem-lab', title: 'Titration lab report', subject: 'Chemistry', activity: 'Submit conclusion and graph', dueDate: localDate(6), priority: 'low', pinned: false, completed: false, createdAt: localDate(-2) },
  { id: 'french-oral', title: 'Oral practice recording', subject: 'French', activity: '90-second response: ma journée', dueDate: localDate(-3), priority: 'medium', pinned: false, completed: true, createdAt: localDate(-15), completedAt: localDate(-4) },
];

function getStoredDeadlines() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as Deadline[] : demoDeadlines;
  } catch {
    return demoDeadlines;
  }
}

function Header({ onAdd, dark, onTheme, onProfile }: { onAdd: () => void; dark: boolean; onTheme: () => void; onProfile: () => void }) {
  return (
    <header className="site-header" data-testid="header-main">
      <div className="brand-lockup"><div className="wordmark">MRC</div></div>
      <div className="header-actions">
        <button className="icon-button hide-mobile" aria-label="Notifications" data-testid="button-notifications"><Bell size={18} /></button>
        <button className="icon-button" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={onTheme} data-testid="button-theme-toggle">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="profile-button" onClick={onProfile} data-testid="button-profile"><span className="avatar">AM</span><span className="profile-name">Amina M.</span><ChevronDown size={15} /></button>
        <button className="icon-button mobile-menu" onClick={onProfile} aria-label="Open menu" data-testid="button-mobile-menu"><Menu size={20} /></button>
      </div>
    </header>
  );
}

function DashboardStats({ active, urgent, done }: { active: number; urgent: number; done: number }) {
  return (
    <section className="stats-strip" aria-label="Deadline summary" data-testid="dashboard-stats">
      <div className="stat-card"><div className="stat-label"><ClipboardList size={15} /> Active deadlines</div><strong>{active}</strong><span>still to complete</span></div>
      <div className="stat-card stat-urgent"><div className="stat-label"><Clock3 size={15} /> Needs attention</div><strong>{urgent}</strong><span>overdue or due today</span></div>
      <div className="stat-card stat-done"><div className="stat-label"><Check size={15} /> Completed</div><strong>{done}</strong><span>filed in history</span></div>
    </section>
  );
}

function TabsNav({ tab, onChange, historyCount }: { tab: Tab; onChange: (tab: Tab) => void; historyCount: number }) {
  return (
    <nav className="tabs-nav" aria-label="Deadline views" data-testid="tabs-nav">
      <button className={tab === 'active' ? 'tab active' : 'tab'} onClick={() => onChange('active')} data-testid="tab-active"><span className="tab-mark" />Active</button>
      <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => onChange('history')} data-testid="tab-history"><History size={15} />History <span className="count-pill">{historyCount}</span></button>
    </nav>
  );
}

function SearchFilterBar({ search, setSearch, subject, setSubject, priority, setPriority, subjects }: { search: string; setSearch: (v: string) => void; subject: string; setSubject: (v: string) => void; priority: string; setPriority: (v: string) => void; subjects: string[] }) {
  return (
    <div className="filter-bar" data-testid="search-filter-bar">
      <label className="search-field"><Search size={17} /><input type="search" aria-label="Search deadlines" placeholder="Search deadlines" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" /></label>
      <div className="filter-controls">
        <label className="select-wrap"><ListFilter size={15} /><select aria-label="Filter by subject" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="select-subject"><option value="all">All subjects</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="select-wrap"><Filter size={15} /><select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)} data-testid="select-priority"><option value="all">Any priority</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
      </div>
    </div>
  );
}

function DeadlineCard({ item, onPin, onComplete, onEdit, onDelete }: { item: Deadline; onPin: () => void; onComplete: () => void; onEdit: () => void; onDelete: () => void }) {
  const status = item.completed ? 'filed' : item.dueDate < localDate() ? 'overdue' : item.dueDate === localDate() ? 'today' : 'normal';
  return (
    <article className={`deadline-card ${status}`} data-testid={`card-deadline-${item.id}`}>
      <span className="urgency-bar" aria-hidden="true" />
      <div className="deadline-main">
        <div className="deadline-line"><span className="subject-label">{item.subject}</span><span className={`priority-dot ${item.priority}`} title={`${item.priority} priority`} aria-label={`${item.priority} priority`} />{item.pinned && <Pin className="pin-indicator" size={13} aria-label="Pinned" />}</div>
        <h3 data-testid={`text-deadline-title-${item.id}`}>{item.title}</h3>
        <p className="activity">{item.activity}</p>
      </div>
      <div className="deadline-side">
        <div className="due-block"><span className="due-label">{item.completed ? 'Completed' : 'Due'}</span><strong>{item.completed ? readableDate(item.completedAt || item.dueDate) : readableDate(item.dueDate)}</strong><small>{item.completed ? 'In history' : relativeDue(item.dueDate)}</small></div>
        <div className="card-actions">
          <button className={`complete-button ${item.completed ? 'completed' : ''}`} onClick={onComplete} aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'} data-testid={`button-complete-${item.id}`}><Check size={17} /></button>
          <button className="more-button" onClick={onEdit} aria-label={`Edit ${item.title}`} data-testid={`button-edit-${item.id}`}><Pencil size={16} /></button>
          <button className="pin-button" onClick={onPin} aria-label={item.pinned ? 'Unpin deadline' : 'Pin deadline'} data-testid={`button-pin-${item.id}`}>{item.pinned ? <Pin size={16} fill="currentColor" /> : <PinOff size={16} />}</button>
          <button className="delete-button" onClick={onDelete} aria-label={`Delete ${item.title}`} data-testid={`button-delete-${item.id}`}><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  );
}

function DeadlineList({ items, onPin, onComplete, onEdit, onDelete, tab }: { items: Deadline[]; onPin: (id: string) => void; onComplete: (id: string) => void; onEdit: (item: Deadline) => void; onDelete: (id: string) => void; tab: Tab }) {
  if (!items.length) return <div className="empty-state" data-testid="empty-deadlines"><div className="empty-icon"><ClipboardList size={25} /></div><h3>{tab === 'history' ? 'No completed deadlines' : 'No deadlines found'}</h3><p>{tab === 'history' ? 'Completed work will appear here.' : 'Try changing your filters, or add a new deadline.'}</p></div>;
  return <div className="deadline-list" data-testid="deadline-list">{items.map((item) => <DeadlineCard key={item.id} item={item} onPin={() => onPin(item.id)} onComplete={() => onComplete(item.id)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />)}</div>;
}

function DeadlineModal({ initial, onClose, onSave }: { initial: Deadline | null; onClose: () => void; onSave: (data: Omit<Deadline, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [subject, setSubject] = useState(initial?.subject || 'Biology');
  const [activity, setActivity] = useState(initial?.activity || '');
  const [dueDate, setDueDate] = useState(initial?.dueDate || localDate(1));
  const [priority, setPriority] = useState<Priority>(initial?.priority || 'medium');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && activity.trim() && dueDate) onSave({ title: title.trim(), subject, activity: activity.trim(), dueDate, priority, pinned: initial?.pinned || false });
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><div className="deadline-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-testid="modal-deadline"><div className="modal-header"><div><h2 id="modal-title">{initial ? 'Edit deadline' : 'Add deadline'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close" data-testid="button-close-modal"><X size={19} /></button></div><form onSubmit={submit}><label>Title<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lab report conclusion" data-testid="input-title" /></label><div className="form-grid"><label>Subject<select value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="input-subject"><option>Biology</option><option>English Literature</option><option>Mathematics</option><option>Modern History</option><option>Chemistry</option><option>French</option><option>Physics</option><option>Art & Design</option></select></label><label>Due date<input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due-date" /></label></div><label>Activity / notes<textarea required value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="A short note about the work" rows={3} data-testid="input-activity" /></label><fieldset><legend>Priority</legend><div className="priority-options">{(['low', 'medium', 'high'] as Priority[]).map((level) => <label key={level} className={`priority-choice ${level} ${priority === level ? 'selected' : ''}`}><input type="radio" name="priority" value={level} checked={priority === level} onChange={() => setPriority(level)} data-testid={`radio-priority-${level}`} /><span className={`priority-dot ${level}`} />{level}</label>)}</div></fieldset><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose} data-testid="button-cancel-modal">Cancel</button><button type="submit" className="button primary" data-testid="button-save-deadline"><Plus size={17} />{initial ? 'Save changes' : 'Add deadline'}</button></div></form></div></div>;
}

function ProfilePopover({ onClose }: { onClose: () => void }) {
  return <div className="profile-popover" data-testid="profile-popover"><div className="profile-popover-head"><span className="avatar large">AM</span><div><strong>Amina Malik</strong><span>Year 12 · MRC</span></div><button onClick={onClose} aria-label="Close profile"><X size={15} /></button></div><div className="profile-row"><Settings size={15} /> Demo profile <span className="demo-badge">LOCAL</span></div><div className="profile-row muted-row"><CircleHelp size={15} /> Changes stay on this device</div></div>;
}

function Home() {
  const [deadlines, setDeadlines] = useState<Deadline[]>(getStoredDeadlines);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [priority, setPriority] = useState('all');
  const [modal, setModal] = useState<Deadline | null | false>(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  const [toast, setToast] = useState('');
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines)); }, [deadlines]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);
  const active = deadlines.filter((item) => !item.completed);
  const history = deadlines.filter((item) => item.completed);
  const urgent = active.filter((item) => item.dueDate <= localDate()).length;
  const subjects = useMemo(() => Array.from(new Set(deadlines.map((item) => item.subject))).sort(), [deadlines]);
  const visible = useMemo(() => (tab === 'active' ? active : history).filter((item) => {
    const query = search.toLowerCase();
    return (!query || `${item.title} ${item.subject} ${item.activity}`.toLowerCase().includes(query)) && (subject === 'all' || item.subject === subject) && (priority === 'all' || item.priority === priority);
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.dueDate.localeCompare(b.dueDate)), [active, history, tab, search, subject, priority]);
  const saveDeadline = (data: Omit<Deadline, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => {
    if (modal) { setDeadlines((all) => all.map((item) => item.id === modal.id ? { ...item, ...data } : item)); setToast('Deadline updated'); }
    else { setDeadlines((all) => [{ ...data, id: `deadline-${Date.now()}`, createdAt: localDate(), completed: false }, ...all]); setToast('Deadline added'); }
    setModal(false);
  };
  const toggleComplete = (id: string) => { setDeadlines((all) => all.map((item) => item.id === id ? { ...item, completed: !item.completed, completedAt: item.completed ? undefined : localDate() } : item)); setToast('Deadline status updated'); };
  const deleteDeadline = (id: string) => { if (window.confirm('Delete this deadline?')) { setDeadlines((all) => all.filter((item) => item.id !== id)); setToast('Deadline deleted'); } };
  return <div className="app-shell"><Header onAdd={() => setModal(null)} dark={dark} onTheme={() => setDark(!dark)} onProfile={() => setProfileOpen(!profileOpen)} />{profileOpen && <ProfilePopover onClose={() => setProfileOpen(false)} />}<main className="main-content"><div className="page-intro"><div><div className="page-kicker">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)}</div><h1>Deadlines</h1><p>See what is due soon and keep your coursework moving.</p></div><button className="button primary add-button" onClick={() => setModal(null)} data-testid="button-add-deadline"><Plus size={18} /> Add deadline</button></div><DashboardStats active={active.length} urgent={urgent} done={history.length} /><TabsNav tab={tab} onChange={setTab} historyCount={history.length} /><SearchFilterBar search={search} setSearch={setSearch} subject={subject} setSubject={setSubject} priority={priority} setPriority={setPriority} subjects={subjects} /><div className="list-heading"><div><h2>{tab === 'active' ? 'Your active deadlines' : 'Completed deadlines'}</h2><span>{visible.length} {visible.length === 1 ? 'deadline' : 'deadlines'}</span></div><span className="sync-note">Saved on this device</span></div><DeadlineList items={visible} onPin={(id) => { setDeadlines((all) => all.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item)); setToast('Pin updated'); }} onComplete={toggleComplete} onEdit={(item) => setModal(item)} onDelete={deleteDeadline} tab={tab} /><footer className="page-footer"><div><span className="footer-mark">MRC</span><span>Student planner</span></div><span>Demo mode · local changes only</span></footer></main>{modal !== false && <DeadlineModal initial={modal} onClose={() => setModal(false)} onSave={saveDeadline} />}{toast && <div className="toast-message" role="status" data-testid="status-toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}</div>;
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route component={() => <div className="not-found"><BookOpen size={30} /><h1>Page not found</h1></div>} /></Switch>;
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}

export default App;