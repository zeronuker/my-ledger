import { useState } from 'react'

function moved(list, index, dir) {
  const next = [...list]
  const j = index + dir
  if (j < 0 || j >= next.length) return list
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

const TABS = ['Add', 'Arrange']

export default function CategoryManagerModal({ categoryGroups, categories, onClose }) {
  const [tab, setTab] = useState('Add')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Manage Categories</h3>
          <button className="modal-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-tabs">
          {TABS.map((t) => (
            <button key={t} className={`mtab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="modal-body">
          {tab === 'Add' && <AddTab categoryGroups={categoryGroups} categories={categories} />}
          {tab === 'Arrange' && <ArrangeTab categoryGroups={categoryGroups} categories={categories} />}
        </div>
      </div>
    </div>
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
      <div className="setting-row">
        <span className="setting-label">Adding</span>
        <div className="seg">
          <button className={type === 'category' ? 'on' : ''} onClick={() => setType('category')}>Category</button>
          <button className={type === 'sub' ? 'on' : ''} onClick={() => setType('sub')}>Sub-category</button>
        </div>
      </div>

      <form onSubmit={submit} className="setting-row">
        {type === 'sub' && (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            <option value="">Choose a category…</option>
            {categoryGroups.items.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <input
          placeholder={type === 'category' ? 'Category name' : 'Sub-category name'}
          value={name} onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="cb-btn cb-btn--primary">ADD</button>
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
    <div className="arrange-list">
      {categoryGroups.items.map((g, gi) => {
        const subs = categories.items.filter((c) => (c.group || null) === g.name)
        return (
          <div key={g.id} className="arrange-group">
            <div className="arrange-row arrange-row--group">
              <span className="arrange-name">{g.name}</span>
              <span className="arrange-arrows">
                <button disabled={gi === 0} onClick={() => moveGroup(gi, -1)}>&uarr;</button>
                <button disabled={gi === categoryGroups.items.length - 1} onClick={() => moveGroup(gi, 1)}>&darr;</button>
                <button
                  className="arrange-delete"
                  disabled={subs.length > 0}
                  title={subs.length > 0 ? 'Move or delete its sub-categories first' : 'Delete category'}
                  onClick={() => categoryGroups.remove(g.id)}
                >&times;</button>
              </span>
            </div>
            {subs.map((c, ci) => (
              <div key={c.id} className="arrange-row arrange-row--sub">
                <span className="arrange-name">{c.name}</span>
                <span className="arrange-arrows">
                  <button disabled={ci === 0} onClick={() => moveSub(g.name, subs, ci, -1)}>&uarr;</button>
                  <button disabled={ci === subs.length - 1} onClick={() => moveSub(g.name, subs, ci, 1)}>&darr;</button>
                  <button className="arrange-delete" title="Delete sub-category" onClick={() => categories.remove(c.id)}>&times;</button>
                </span>
              </div>
            ))}
          </div>
        )
      })}
      {categoryGroups.items.length === 0 && <p className="dim">No categories yet — add one from the Add tab.</p>}
    </div>
  )
}
