import { useState } from 'react'
import { SmSectionHead, SmSegmented, SmCloseIcon } from './SettingsControls.jsx'

function moved(list, index, dir) {
  const next = [...list]
  const j = index + dir
  if (j < 0 || j >= next.length) return list
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

const TABS = [
  { id: 'add', label: 'Add', hint: 'new category' },
  { id: 'arrange', label: 'Arrange', hint: 'reorder · delete' },
]

export default function CategoryManagerModal({ categoryGroups, categories, onClose }) {
  const [tab, setTab] = useState('add')

  return (
    <>
      <div className="sm-backdrop" onClick={onClose} />
      <div className="sm-modal cmm-modal" role="dialog" aria-modal="true" aria-label="Manage Categories">
        <header className="sm-head">
          <div>
            <div className="sm-eyebrow">// expenses</div>
            <h2 className="sm-title">Manage Categories</h2>
          </div>
          <button className="sm-close" onClick={onClose} aria-label="Close"><SmCloseIcon /></button>
        </header>

        <nav className="sm-tabs cmm-tabs">
          {TABS.map((t) => (
            <button
              key={t.id} className={`sm-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="sm-tab-label">{t.label}</span>
              <span className="sm-tab-hint">{t.hint}</span>
            </button>
          ))}
        </nav>

        <div className="sm-body">
          {tab === 'add' && <AddTab categoryGroups={categoryGroups} categories={categories} />}
          {tab === 'arrange' && <ArrangeTab categoryGroups={categoryGroups} categories={categories} />}
        </div>

        <footer className="sm-foot">
          <div className="sm-foot-note">// changes apply immediately</div>
          <button className="cb-btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </>
  )
}

function AddTab({ categoryGroups, categories }) {
  const [type, setType] = useState('category') // 'category' | 'sub'
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (type === 'category') {
      categoryGroups.add({ name: name.trim(), order: categoryGroups.items.length })
    } else {
      const group = categoryGroups.items.find((g) => g.id === groupId)
      if (!group) return
      const siblings = categories.items.filter((c) => (c.group || null) === group.name)
      categories.add({ name: name.trim(), group: group.name, order: siblings.length })
    }
    setName('')
  }

  return (
    <>
      <SmSectionHead title="Adding" hint="// category or sub-category" />
      <SmSegmented
        value={type} onChange={setType}
        options={[{ value: 'category', label: 'Category' }, { value: 'sub', label: 'Sub-category' }]}
      />

      <form onSubmit={submit} className="cmm-inline-form">
        {type === 'sub' && (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            <option value="">Choose a category…</option>
            {categoryGroups.items.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <input
          className="sm-input"
          placeholder={type === 'category' ? 'Category name' : 'Sub-category name'}
          value={name} onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="cb-btn-primary">Add</button>
      </form>
    </>
  )
}

function ArrangeTab({ categoryGroups, categories }) {
  function moveGroup(index, dir) {
    categoryGroups.reorder(moved(categoryGroups.items, index, dir))
  }
  function moveSub(groupName, subList, index, dir) {
    categories.reorder(moved(subList, index, dir))
  }

  return (
    <>
      <SmSectionHead title="Categories" hint="// ↑↓ reorder · ✕ delete" />
      <div className="cmm-arrange">
        {categoryGroups.items.map((g, gi) => {
          const subs = categories.items.filter((c) => (c.group || null) === g.name)
          return (
            <div key={g.id} className="cmm-arrange-group">
              <div className="cmm-arrange-head">
                <span className="cmm-arrange-name">{g.name}</span>
                <span className="cmm-arrange-btns">
                  <button disabled={gi === 0} onClick={() => moveGroup(gi, -1)}>&uarr;</button>
                  <button disabled={gi === categoryGroups.items.length - 1} onClick={() => moveGroup(gi, 1)}>&darr;</button>
                  <button
                    className="del"
                    disabled={subs.length > 0}
                    title={subs.length > 0 ? 'Move or delete its sub-categories first' : 'Delete category'}
                    onClick={() => categoryGroups.remove(g.id)}
                  >&times;</button>
                </span>
              </div>
              {subs.map((c, ci) => (
                <div key={c.id} className="cmm-arrange-sub">
                  <span>{c.name}</span>
                  <span className="cmm-arrange-btns">
                    <button disabled={ci === 0} onClick={() => moveSub(g.name, subs, ci, -1)}>&uarr;</button>
                    <button disabled={ci === subs.length - 1} onClick={() => moveSub(g.name, subs, ci, 1)}>&darr;</button>
                    <button className="del" title="Delete sub-category" onClick={() => categories.remove(c.id)}>&times;</button>
                  </span>
                </div>
              ))}
            </div>
          )
        })}
        {categoryGroups.items.length === 0 && <p className="dim">No categories yet — add one from the Add tab.</p>}
      </div>
    </>
  )
}
