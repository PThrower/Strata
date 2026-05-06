'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolicyRow {
  id:                     string
  name:                   string
  description:            string | null
  enabled:                boolean
  action:                 'block' | 'warn'
  match_capability_flags: string[] | null
  match_risk_level_gte:   string | null
  match_tool_names:       string[] | null
  time_start_hour:        number | null
  time_end_hour:          number | null
  agent_id:               string | null
  priority:               number
  created_at:             string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CAP_FLAGS = [
  'shell_exec', 'fs_write', 'net_egress', 'secret_read',
  'dynamic_eval', 'arbitrary_sql', 'process_spawn',
] as const

const ALL_TOOLS = [
  'get_best_practices', 'get_latest_news', 'get_top_integrations', 'search_ecosystem',
  'find_mcp_servers', 'list_ecosystems', 'verify_payment_endpoint',
  'verify_agent_credential', 'track_data_flow',
] as const

const RISK_OPTIONS = ['medium', 'high', 'critical'] as const

const TEMPLATES = [
  {
    label: '+ Block shell_exec',
    preset: {
      name: 'No shell execution',
      action: 'block' as const,
      match_capability_flags: ['shell_exec'],
      match_risk_level_gte: null as null,
      match_tool_names: null as null,
      time_start_hour: null as null,
      time_end_hour: null as null,
      agent_id: '',
      priority: 100,
      description: '',
    },
  },
  {
    label: '+ Block high risk servers',
    preset: {
      name: 'Block high-risk servers',
      action: 'block' as const,
      match_capability_flags: null as null,
      match_risk_level_gte: 'high',
      match_tool_names: null as null,
      time_start_hour: null as null,
      time_end_hour: null as null,
      agent_id: '',
      priority: 100,
      description: '',
    },
  },
  {
    label: '+ No net_egress at night',
    preset: {
      name: 'No net_egress 23:00–06:00 UTC',
      action: 'block' as const,
      match_capability_flags: ['net_egress'],
      match_risk_level_gte: null as null,
      match_tool_names: null as null,
      time_start_hour: 23,
      time_end_hour: 6,
      agent_id: '',
      priority: 100,
      description: '',
    },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function conditionSummary(p: PolicyRow): string {
  const parts: string[] = []
  if (p.match_capability_flags?.length) parts.push(`servers with ${p.match_capability_flags.join(', ')}`)
  if (p.match_risk_level_gte)           parts.push(`risk ≥ ${p.match_risk_level_gte}`)
  if (p.match_tool_names?.length)       parts.push(`tool: ${p.match_tool_names.join(', ')}`)
  if (p.time_start_hour !== null && p.time_end_hour !== null)
    parts.push(`${String(p.time_start_hour).padStart(2,'0')}:00–${String(p.time_end_hour).padStart(2,'0')}:00 UTC`)
  return parts.join(' · ') || '—'
}

// ── Blank form state ──────────────────────────────────────────────────────────

const blankForm = {
  name: '', description: '', action: 'block' as 'block' | 'warn',
  match_capability_flags: null as string[] | null,
  match_risk_level_gte: null as string | null,
  match_tool_names: null as string[] | null,
  time_start_hour: null as number | null,
  time_end_hour:   null as number | null,
  agent_id: '', priority: 100,
}
type FormState = typeof blankForm

// ── Main component ────────────────────────────────────────────────────────────

// Read ?prefill=capability_flag&value=<flag> from the URL — used by the
// threat feed's "Block this flag" button. Lazy initialisers run once on mount
// (client-only) so we avoid setState inside an effect.
function prefillFromUrl(): { form: FormState; showForm: boolean } {
  if (typeof window === 'undefined') return { form: blankForm, showForm: false }
  const params  = new URLSearchParams(window.location.search)
  const prefill = params.get('prefill')
  const value   = params.get('value')
  if (prefill === 'capability_flag' && value && ALL_CAP_FLAGS.includes(value as typeof ALL_CAP_FLAGS[number])) {
    return {
      form: { ...blankForm, name: `Block ${value}`, action: 'block', match_capability_flags: [value] },
      showForm: true,
    }
  }
  return { form: blankForm, showForm: false }
}

export default function PoliciesClient({ initialPolicies }: { initialPolicies: PolicyRow[] }) {
  const [policies, setPolicies]     = useState<PolicyRow[]>(initialPolicies)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => prefillFromUrl(), [])
  const [showForm, setShowForm]     = useState(initial.showForm)
  const [form, setForm]             = useState<FormState>(initial.form)
  const [editId, setEditId]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PolicyRow | null>(null)
  const [formError, setFormError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Clean the prefill params from the URL after the form is seeded (no setState).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('prefill') === 'capability_flag') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const CARD: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }
  const btnBase = 'text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50'
  const btnPrimary = `${btnBase} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`
  const btnGhost   = `${btnBase} bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground`
  const btnDanger  = `${btnBase} bg-background hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600`

  function openCreate(preset?: FormState) {
    setForm(preset ?? blankForm)
    setEditId(null)
    setFormError(null)
    setShowForm(true)
  }

  function toggleCapFlag(flag: string) {
    const cur = form.match_capability_flags ?? []
    const next = cur.includes(flag) ? cur.filter(f => f !== flag) : [...cur, flag]
    setForm(f => ({ ...f, match_capability_flags: next.length > 0 ? next : null }))
  }

  function toggleToolName(tool: string) {
    const cur = form.match_tool_names ?? []
    const next = cur.includes(tool) ? cur.filter(t => t !== tool) : [...cur, tool]
    setForm(f => ({ ...f, match_tool_names: next.length > 0 ? next : null }))
  }

  function handleSubmit() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    const hasCondition =
      (form.match_capability_flags?.length ?? 0) > 0 ||
      form.match_risk_level_gte != null ||
      (form.match_tool_names?.length ?? 0) > 0 ||
      (form.time_start_hour !== null && form.time_end_hour !== null)
    if (!hasCondition) { setFormError('At least one condition is required'); return }
    setFormError(null)

    startTransition(async () => {
      const url   = editId ? `/api/v1/policies/${editId}` : '/api/v1/policies'
      const method = editId ? 'PUT' : 'POST'
      const body = {
        name:                   form.name.trim(),
        description:            form.description.trim() || undefined,
        action:                 form.action,
        match_capability_flags: form.match_capability_flags,
        match_risk_level_gte:   form.match_risk_level_gte,
        match_tool_names:       form.match_tool_names,
        time_start_hour:        form.time_start_hour,
        time_end_hour:          form.time_end_hour,
        agent_id:               form.agent_id.trim() || undefined,
        priority:               form.priority,
        enabled:                true,
      }
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json() as PolicyRow & { error?: string }
      if (!res.ok) { setFormError((data as { error?: string }).error ?? 'Failed to save'); return }
      if (editId) {
        setPolicies(prev => prev.map(p => p.id === editId ? data : p))
      } else {
        setPolicies(prev => [...prev, data])
      }
      setShowForm(false); setForm(blankForm); setEditId(null)
    })
  }

  function handleToggle(policy: PolicyRow) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/policies/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !policy.enabled }),
      })
      if (res.ok) {
        const data = await res.json() as PolicyRow
        setPolicies(prev => prev.map(p => p.id === policy.id ? data : p))
      }
    })
  }

  function handleDelete(policy: PolicyRow) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/policies/${policy.id}`, { method: 'DELETE' })
      if (res.ok) setPolicies(prev => prev.filter(p => p.id !== policy.id))
      setDeleteTarget(null)
    })
  }

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{policies.length} rule{policies.length !== 1 ? 's' : ''}</p>
        {!showForm && <button onClick={() => openCreate()} className={btnPrimary}>+ Create Rule</button>}
      </div>

      {/* ── Create / Edit Form ───────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ ...CARD, padding: 24, marginBottom: 24 }}>
          <h2 className="text-sm font-medium mb-4">{editId ? 'Edit Rule' : 'New Rule'}</h2>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. No shell execution" maxLength={80}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            {/* Action */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Action <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {(['block','warn'] as const).map(a => (
                  <button key={a} type="button"
                    onClick={() => setForm(f => ({ ...f, action: a }))}
                    className={`px-4 py-1.5 text-xs rounded-md border transition-colors ${form.action === a
                      ? a === 'block'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {/* Capability flags */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Capability flags <span className="text-muted-foreground">(match if server has ANY)</span></label>
              <div className="flex flex-wrap gap-2">
                {ALL_CAP_FLAGS.map(f => {
                  const active = (form.match_capability_flags ?? []).includes(f)
                  return (
                    <button key={f} type="button" onClick={() => toggleCapFlag(f)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${active
                        ? 'bg-emerald-800/40 border-emerald-600 text-emerald-300'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                    >{f}</button>
                  )
                })}
              </div>
            </div>
            {/* Risk level */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Minimum risk level</label>
              <div className="flex gap-2 items-center">
                <select
                  value={form.match_risk_level_gte ?? ''}
                  onChange={e => setForm(f => ({ ...f, match_risk_level_gte: e.target.value || null }))}
                  className="text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">— none —</option>
                  {RISK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {form.match_risk_level_gte && (
                  <span className="text-xs text-muted-foreground">blocks servers with risk ≥ {form.match_risk_level_gte}</span>
                )}
              </div>
            </div>
            {/* Tool names */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Strata tools <span className="text-muted-foreground">(optional)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TOOLS.map(t => {
                  const active = (form.match_tool_names ?? []).includes(t)
                  return (
                    <button key={t} type="button" onClick={() => toggleToolName(t)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${active
                        ? 'bg-emerald-800/40 border-emerald-600 text-emerald-300'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                    >{t}</button>
                  )
                })}
              </div>
            </div>
            {/* Time window */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Time window — UTC <span className="text-muted-foreground">(optional)</span></label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={23} placeholder="start hour"
                  value={form.time_start_hour ?? ''}
                  onChange={e => setForm(f => ({ ...f, time_start_hour: e.target.value === '' ? null : parseInt(e.target.value) }))}
                  className="w-24 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <input
                  type="number" min={0} max={23} placeholder="end hour"
                  value={form.time_end_hour ?? ''}
                  onChange={e => setForm(f => ({ ...f, time_end_hour: e.target.value === '' ? null : parseInt(e.target.value) }))}
                  className="w-24 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-xs text-muted-foreground">0–23 UTC · wraps midnight</span>
              </div>
            </div>
            {/* Agent ID */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Agent scope <span className="text-muted-foreground">(leave blank for all agents)</span></label>
              <input
                type="text" value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
                placeholder="agt_a1b2c3d4…"
                className="w-64 text-sm font-mono bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            {/* Priority */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Priority <span className="text-muted-foreground">(lower = evaluated first)</span></label>
              <input
                type="number" min={1} max={1000} value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 100 }))}
                className="w-24 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSubmit} disabled={isPending} className={btnPrimary}>
                {isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Rule'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); setFormError(null) }} disabled={isPending} className={btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {policies.length === 0 && !showForm ? (
        <div style={{ ...CARD, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p className="text-base font-medium mb-2">No policies defined.</p>
          <p className="text-sm text-muted-foreground mb-6">Your agents can connect to any server. Create a rule to restrict access.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => openCreate(t.preset)}
                className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground">
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : policies.length > 0 ? (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="text-left border-b border-border">
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium text-center">Enabled</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.name}</span>
                    {p.description && <span className="block text-xs text-muted-foreground">{p.description}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{conditionSummary(p)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.action === 'block'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    }`}>{p.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {p.agent_id ? p.agent_id.slice(0, 14) + '…' : 'All agents'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={isPending}
                      aria-label={p.enabled ? 'Disable rule' : 'Enable rule'}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        p.enabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        p.enabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setDeleteTarget(p)} disabled={isPending} className={btnDanger}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-border">
            <p className="text-sm font-medium mb-1">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="text-sm text-muted-foreground mb-5">This rule will stop being enforced immediately.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={isPending}
                className="text-sm px-4 py-2 border border-border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget)} disabled={isPending}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-60">
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
