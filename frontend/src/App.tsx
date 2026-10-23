import { useMemo, useState } from 'react'
import {
  Activity, AlertCircle, Archive, ArrowRight, Bell, BookOpen, Check, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardCheck, Clock3, FileCheck2, FileText, Flag,
  FolderOpen, GitBranch, LayoutDashboard, LoaderCircle, Menu, MoreHorizontal,
  PanelLeft, ScanSearch, Search, ShieldCheck, SlidersHorizontal, Sparkles, Upload,
  UserRound, X, XCircle, Zap
} from 'lucide-react'

type ReviewState = 'unreviewed' | 'confirmed' | 'corrected' | 'flagged'
type Stage = { label: string; icon: typeof Upload; state: 'complete' | 'active' | 'pending'; note: string }
type Evidence = { id: string; source: string; facility: string; date: string; time: string; excerpt: string; dosage: string; confidence: string; missing?: string; accent: string }

const stages: Stage[] = [
  { label: 'Upload', icon: Upload, state: 'complete', note: '3 documents' },
  { label: 'Extract', icon: ScanSearch, state: 'complete', note: 'Medication entities' },
  { label: 'Detect', icon: Zap, state: 'complete', note: '1 conflict found' },
  { label: 'Trace', icon: GitBranch, state: 'complete', note: '3 source records' },
  { label: 'Verify', icon: ClipboardCheck, state: 'active', note: 'Human review' },
  { label: 'Audit', icon: Archive, state: 'pending', note: 'Ready after review' },
]

const evidence: Evidence[] = [
  { id: 'a', source: 'med-list-2026-10-12.pdf', facility: 'Hospital A', date: 'Oct 12, 2026', time: '09:42', excerpt: '“Medication X — take one tablet by mouth each evening.”', dosage: 'Dosage not present', confidence: '96%', missing: 'Strength / dosage frequency', accent: 'blue' },
  { id: 'b', source: 'discharge-summary-1018.pdf', facility: 'Hospital B', date: 'Oct 18, 2026', time: '15:08', excerpt: '“Continue Medication X as previously prescribed. Follow up with primary care.”', dosage: 'Instructions incomplete', confidence: '88%', missing: 'Strength / route', accent: 'violet' },
  { id: 'c', source: 'clinic-note-1018.txt', facility: 'Clinic C', date: 'Oct 18, 2026', time: '16:31', excerpt: '“Patient reports taking Medication X; outside records requested.”', dosage: 'Patient-reported', confidence: '79%', missing: 'Exact product / strength', accent: 'teal' },
]

const initialAudit = [
  { time: 'Today, 09:42', title: 'Conflict detected', detail: 'Medication X matched across 3 source records.', icon: AlertCircle, tone: 'warning' },
  { time: 'Today, 09:41', title: 'Source trace completed', detail: '3 synthetic records linked to patient SM001.', icon: GitBranch, tone: 'teal' },
  { time: 'Today, 09:40', title: 'Entities extracted', detail: '1 medication entity found in uploaded documents.', icon: ScanSearch, tone: 'teal' },
  { time: 'Today, 09:39', title: 'Documents uploaded', detail: '3 synthetic source files added to review workspace.', icon: Upload, tone: 'navy' },
]

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function App() {
  const [activeNav, setActiveNav] = useState('Workspace')
  const [review, setReview] = useState<ReviewState>('unreviewed')
  const [toast, setToast] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [audit, setAudit] = useState(initialAudit)

  const reviewLabel = review === 'unreviewed' ? 'Review required' : `${review[0].toUpperCase()}${review.slice(1)} locally`
  const reviewTone = review === 'unreviewed' ? 'warning' : review === 'flagged' ? 'danger' : 'success'

  const act = (next: ReviewState, label: string) => {
    setReview(next)
    setToast(`${label} saved to this demo session`)
    setAudit([{ time: 'Just now', title: `Demo action: ${label}`, detail: 'Local UI state only · not persisted to a database.', icon: next === 'flagged' ? Flag : CheckCircle2, tone: next === 'flagged' ? 'warning' : 'teal' }, ...audit])
    window.setTimeout(() => setToast(''), 2600)
  }

  const navItems = useMemo(() => [
    { label: 'Workspace', icon: LayoutDashboard }, { label: 'Patients', icon: UserRound }, { label: 'Sources', icon: FolderOpen }, { label: 'Audit log', icon: Archive }
  ], [])

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={19} /></div><div><strong>SafeMed</strong><span>Review workspace</span></div><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)}><X size={17} /></button></div>
      <div className="workspace-switcher"><div className="workspace-icon"><Activity size={16} /></div><div><small>WORKSPACE</small><strong>Northstar demo</strong></div><ChevronDown size={15} /></div>
      <nav className="primary-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav(label); setMobileNav(false) }}><Icon size={17} /><span>{label}</span>{label === 'Audit log' && <span className="nav-count">4</span>}</button>)}</nav>
      <div className="sidebar-rule" />
      <div className="sidebar-label">TOOLS</div>
      <button className="nav-item"><SlidersHorizontal size={17} /><span>Review settings</span></button>
      <button className="nav-item"><CircleHelp size={17} /><span>Help center</span></button>
      <div className="sidebar-bottom"><div className="integration-card"><div className="integration-top"><span className="status-dot" /> <span>Demo environment</span></div><p>All records are synthetic. Integrations are unavailable.</p><button>View limitations <ArrowRight size={13} /></button></div><div className="profile-row"><div className="avatar">AS</div><div><strong>Alex Smith</strong><span>Reviewer</span></div><MoreHorizontal size={18} /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ArrowRight size={14} /><strong>Patient review</strong></div><div className="top-actions"><div className="search-box"><Search size={16} /><input placeholder="Search patients, records…" /><kbd>⌘ K</kbd></div><button className="icon-button notification"><Bell size={18} /><i /></button><div className="top-avatar">AS</div></div></header>
      <div className="page-wrap">
        <section className="patient-header"><div className="eyebrow"><span>ACTIVE REVIEW</span><span className="divider-dot" /><span>CASE SM001</span></div><div className="patient-title-row"><div><h1>Patient record <span className="muted-heading">/</span> SM001</h1><p className="patient-subtitle">Synthetic patient · Medication reconciliation case</p></div><div className="header-actions"><button className="secondary-button"><FileText size={16} /> View source bundle</button><button className="primary-button"><Sparkles size={16} /> Run review <span className="demo-label">DEMO</span></button></div></div><div className="patient-facts"><div><span className="fact-label">PATIENT ID</span><strong>SM001</strong></div><div><span className="fact-label">DATE OF BIRTH</span><strong>Jan 14, 1983 <em>synthetic</em></strong></div><div><span className="fact-label">LAST UPDATED</span><strong>Oct 18, 2026 · 16:31</strong></div><div className="patient-status"><StatusPill tone={reviewTone}>{review === 'unreviewed' ? <AlertCircle size={13} /> : <Check size={13} />}{reviewLabel}</StatusPill></div></div></section>

        <section className="workflow-card"><div className="workflow-heading"><div><span className="section-kicker">RECONCILIATION FLOW</span><h2>From source file to accountable review</h2></div><span className="demo-chip"><span className="pulse-dot" /> Demo processing</span></div><div className="stage-rail">{stages.map((stage, index) => { const Icon = stage.icon; return <div key={stage.label} className={`stage ${stage.state}`}><div className="stage-main"><div className="stage-icon"><Icon size={16} /></div><div><strong>{stage.label}</strong><span>{stage.note}</span></div></div>{index < stages.length - 1 && <div className="stage-connector" />}</div> })}</div></section>

        <div className="notice-bar"><div className="notice-icon"><AlertCircle size={18} /></div><div><strong>Human review required</strong><span>Medication X appears in three records with incomplete strength and dosage details. No recommendation has been made.</span></div><button onClick={() => document.getElementById('review-panel')?.scrollIntoView({ behavior: 'smooth' })}>Review conflict <ArrowRight size={14} /></button></div>

        <div className="content-grid"><div className="main-column"><section className="section-block"><div className="section-header"><div><span className="section-kicker">DETECTED CONFLICT · 01</span><h2>Medication X <StatusPill tone="warning">Needs verification</StatusPill></h2></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="conflict-summary"><div className="med-icon"><Plus size={20} /></div><div><strong>Medication X</strong><p>Same medication name found across 3 source records, but dosage details do not agree or are not present.</p></div><div className="summary-meta"><span>Sources</span><strong>03</strong></div><div className="summary-meta"><span>Confidence range</span><strong>79–96%</strong></div></div><div className="evidence-list">{evidence.map((item) => <EvidenceCard key={item.id} item={item} />)}</div></section>

          <section className="section-block unavailable-card"><div className="unavailable-icon"><GitBranch size={18} /></div><div><span className="section-kicker">INTEGRATION STATUS</span><h3>External source connections unavailable</h3><p>Live EHR connections are not enabled in this demo environment. The records above are synthetic snapshots created for review testing.</p></div><StatusPill>Unavailable</StatusPill></section>
        </div><aside className="side-column"><ReviewPanel review={review} act={act} showMenu={showMenu} setShowMenu={setShowMenu} /><AuditTimeline audit={audit} /></aside></div>
        <footer className="footer-note"><span><ShieldCheck size={14} /> SafeMed demo workspace</span><span>For product demonstration only · synthetic data · no clinical decision support</span></footer>
      </div>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </main>
  </div>
}

function EvidenceCard({ item }: { item: Evidence }) {
  return <article className="evidence-card"><div className={`evidence-source source-${item.accent}`}><FileText size={17} /></div><div className="evidence-body"><div className="evidence-title"><div><strong>{item.facility}</strong><span>{item.source}</span></div><div className="evidence-date"><strong>{item.date}</strong><span>{item.time}</span></div></div><blockquote>{item.excerpt}</blockquote><div className="evidence-bottom"><div className="detail-pair"><span>Captured dosage</span><strong className={item.missing ? 'missing-text' : ''}>{item.dosage} <AlertCircle size={13} /></strong></div><div className="detail-pair"><span>Extraction confidence</span><strong>{item.confidence}</strong></div><StatusPill tone="neutral"><BookOpen size={13} /> Source evidence</StatusPill></div>{item.missing && <div className="missing-callout"><AlertCircle size={14} /><span><strong>Missing information:</strong> {item.missing}</span></div>}</div></article>
}

function ReviewPanel({ review, act, showMenu, setShowMenu }: { review: ReviewState; act: (s: ReviewState, l: string) => void; showMenu: boolean; setShowMenu: (v: boolean) => void }) {
  return <section className="review-panel" id="review-panel"><div className="panel-heading"><div><span className="section-kicker">REVIEW DECISION</span><h2>What did you find?</h2></div><div className="menu-wrap"><button className="icon-button" onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={18} /></button>{showMenu && <div className="menu-popover"><button>Open review guidelines</button><button>Copy case ID</button></div>}</div></div><p className="panel-copy">Choose an action for this demo case. Your selection is recorded locally in the timeline.</p><div className="review-state"><span className={`state-symbol state-${review}`}><ShieldCheck size={17} /></span><div><strong>{review === 'unreviewed' ? 'Awaiting your review' : `Marked ${review}`}</strong><span>{review === 'unreviewed' ? 'No action has been taken.' : 'This status is local to the demo session.'}</span></div></div><div className="action-stack"><button className="review-action confirm" onClick={() => act('confirmed', 'Confirm')}><CheckCircle2 size={17} /><span><strong>Confirm</strong><small>Records are consistent enough to proceed</small></span><ArrowRight size={16} /></button><button className="review-action correct" onClick={() => act('corrected', 'Correct')}><FileCheck2 size={17} /><span><strong>Correct</strong><small>Enter a correction to the extracted data</small></span><ArrowRight size={16} /></button><button className="review-action flag" onClick={() => act('flagged', 'Flag')}><Flag size={17} /><span><strong>Flag for follow-up</strong><small>Keep open for another reviewer</small></span><ArrowRight size={16} /></button></div><div className="demo-disclaimer"><Sparkles size={14} /><span><strong>Demo-only behavior.</strong> Actions do not change patient data, call an AI model, or persist outside this browser session.</span></div></section>
}

function AuditTimeline({ audit }: { audit: typeof initialAudit }) {
  return <section className="audit-panel"><div className="panel-heading"><div><span className="section-kicker">AUDIT TRAIL</span><h2>Case activity</h2></div><StatusPill tone="success"><span className="status-dot" /> Live session</StatusPill></div><div className="timeline">{audit.slice(0, 5).map((entry, i) => { const Icon = entry.icon; return <div className="timeline-item" key={`${entry.time}-${entry.title}-${i}`}><div className={`timeline-icon tone-${entry.tone}`}><Icon size={14} /></div><div><span>{entry.time}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div></div> })}</div><button className="text-button">View complete audit trail <ArrowRight size={14} /></button></section>
}

function Plus({ size }: { size: number }) { return <span style={{ fontSize: size, fontWeight: 700, lineHeight: 1 }}>＋</span> }

export default App
