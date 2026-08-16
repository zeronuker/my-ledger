import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query,
} from 'firebase/firestore'
import { db } from './firebase'

// Subscribes to users/{uid}/<path> and gives back live items + CRUD helpers.
// Shared by Expenses, CreditCards (transactions) and Income — same shape,
// same per-user isolation, no reason to hand-roll onSnapshot three times.
export function useCollection(uid, path, orderField = 'date') {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, 'users', uid, ...path.split('/')), orderBy(orderField, 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid, path, orderField])

  const colRef = () => collection(db, 'users', uid, ...path.split('/'))
  const add = (data) => addDoc(colRef(), data)
  const update = (id, data) => updateDoc(doc(colRef(), id), data)
  const remove = (id) => deleteDoc(doc(colRef(), id))

  return { items, loading, add, update, remove }
}
