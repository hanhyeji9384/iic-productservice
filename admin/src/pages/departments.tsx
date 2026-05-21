import { useState } from 'react'
import { Briefcase, Plus, Edit, Trash2, X, Save, Clock } from 'lucide-react'
import { Pagination } from '@/components/pagination'
import { SummaryCell } from '@/components/summary-cell'
import { DEPARTMENTS as INITIAL_DEPARTMENTS } from '@/lib/mock-data'
import type { Department } from '@/lib/types'

type Tab = 'list' | 'history'

interface ChangeLog {
  id: string
  changeType: 'update' | 'delete'
  target: string
  summary: string
  changedAt: string
  changedByName: string
  changedById: string
}

const ITEMS_PER_PAGE = 10

const CHANGE_TYPE_STYLE = {
  update: { bg: 'bg-blue-50 text-blue-700', label: '수정' },
  delete: { bg: 'bg-red-50 text-red-700',   label: '삭제' },
}

const INITIAL_LOGS: ChangeLog[] = [
  {
    id: 'L001', changeType: 'update', target: 'PS팀',
    summary: '설명: "수리서비스 운영" → "수리서비스 전담 운영"',
    changedAt: '2026-04-10 14:22:05',
    changedByName: '한혜지', changedById: 'monster563',
  },
  {
    id: 'L002', changeType: 'update', target: 'CS팀',
    summary: '부서명: "고객지원팀" → "CS팀" / 설명: "고객 문의 대응" → "고객서비스"',
    changedAt: '2026-04-01 09:45:30',
    changedByName: '김민준', changedById: 'monster001',
  },
  {
    id: 'L003', changeType: 'delete', target: '구매팀',
    summary: '부서명: "구매팀" / 설명: "제품 및 부품 구매"',
    changedAt: '2026-03-25 11:03:41',
    changedByName: '한혜지', changedById: 'monster563',
  },
]

function nowString() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function DepartmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS)
  const [logs, setLogs] = useState<ChangeLog[]>(INITIAL_LOGS)
  const [listPage, setListPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  function openAdd() {
    setEditingDept(null)
    setFormName('')
    setFormDesc('')
    setShowModal(true)
  }

  function openEdit(dept: Department) {
    setEditingDept(dept)
    setFormName(dept.name)
    setFormDesc(dept.description ?? '')
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditingDept(null) }

  function handleSave() {
    if (!formName.trim()) { alert('부서명을 입력해주세요.'); return }
    const now = nowString()
    if (editingDept) {
      const diffs: string[] = []
      if (editingDept.name !== formName)
        diffs.push(`부서명: "${editingDept.name}" → "${formName}"`)
      const oldDesc = editingDept.description ?? ''
      const newDesc = formDesc ?? ''
      if (oldDesc !== newDesc)
        diffs.push(`설명: "${oldDesc || '(없음)'}" → "${newDesc || '(없음)'}"`)
      const summary = diffs.length > 0 ? diffs.join(' / ') : '변경 없음'
      setDepartments(prev => prev.map(d =>
        d.id === editingDept.id ? { ...d, name: formName, description: formDesc || undefined } : d
      ))
      setLogs(prev => [{
        id: `L${Date.now()}`, changeType: 'update', target: formName,
        summary,
        changedAt: now, changedByName: '한혜지', changedById: 'monster563',
      }, ...prev])
    } else {
      const newDept: Department = {
        id: `D${String(Date.now()).slice(-4)}`,
        name: formName,
        description: formDesc || undefined,
      }
      setDepartments(prev => [...prev, newDept])
    }
    closeModal()
  }

  function handleDelete(dept: Department) {
    if (!confirm(`"${dept.name}" 부서를 삭제하시겠습니까?`)) return
    setDepartments(prev => prev.filter(d => d.id !== dept.id))
    setLogs(prev => [{
      id: `L${Date.now()}`, changeType: 'delete', target: dept.name,
      summary: `부서명: "${dept.name}"${dept.description ? ` / 설명: "${dept.description}"` : ''}`,
      changedAt: nowString(), changedByName: '한혜지', changedById: 'monster563',
    }, ...prev])
  }

  const paginatedDepts = departments.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE)
  const paginatedLogs = logs.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'list',    label: '부서 목록' },
    { key: 'history', label: '변경 이력' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">부서 관리</h1>
          <p className="text-sm text-gray-500 mt-1">조직 내 부서를 생성·수정·삭제합니다.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          부서 추가
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {key === 'list' ? <Briefcase className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* 부서 목록 */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['부서명', '설명', '작업'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDepts.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400">등록된 부서가 없습니다.</td></tr>
                ) : paginatedDepts.map(dept => (
                  <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{dept.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{dept.description ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(dept)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(dept)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={departments.length} perPage={ITEMS_PER_PAGE} current={listPage} onChange={setListPage} />
        </div>
      )}

      {/* 변경 이력 */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['처리 일시', '유형', '대상 부서', '변경 내용', '처리자'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide bg-gray-50/50 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">변경 이력이 없습니다.</td></tr>
                ) : paginatedLogs.map(log => {
                  const style = CHANGE_TYPE_STYLE[log.changeType]
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.changedAt} <span className="text-gray-400">(KST)</span></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg}`}>{style.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{log.target}</td>
                      <td className="px-6 py-4"><SummaryCell summary={log.summary} changeType={log.changeType} /></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.changedByName}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{log.changedById}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={logs.length} perPage={ITEMS_PER_PAGE} current={historyPage} onChange={setHistoryPage} />
        </div>
      )}

      {/* 부서 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{editingDept ? '부서 수정' : '부서 추가'}</h3>
                <p className="text-sm text-gray-500 mt-0.5">부서명과 설명을 입력하세요.</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">부서명 *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  placeholder="예: PS팀"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
                <input
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f8f9fb] border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
                  placeholder="부서 역할이나 담당 업무"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">취소</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium">
                <Save className="w-4 h-4" />
                {editingDept ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
