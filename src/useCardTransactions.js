import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore'
import { db } from './firebase'

// Generous cap on how far back a single card's history loads. A single
// equality filter (cardId) + orderBy on a different field (date) is a
// standard Firestore pattern that doesn't need a manual composite index,
// unlike adding a date range filter on top — so range-narrowing (3M/6M/etc)
// stays client-side on this already-scoped set instead of a second where().
const FETCH_LIMIT = 1000

// Scoped to one card (unlike useCollection(uid, 'cardTransactions'), which
// pulls every transaction for every card — fine for Dashboard's all-cards
// totals, too much for a single card's transaction list).
export function useCardTransactions(uid, cardId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !cardId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const colRef = collection(db, 'users', uid, 'cardTransactions')
    const q = query(colRef, where('cardId', '==', cardId), orderBy('date', 'desc'), limit(FETCH_LIMIT))
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid, cardId])

  const colRef = () => collection(db, 'users', uid, 'cardTransactions')
  const add = (data) => addDoc(colRef(), data)
  const update = (id, data) => updateDoc(doc(colRef(), id), data)
  const remove = (id) => deleteDoc(doc(colRef(), id))

  return { items, loading, add, update, remove }
}
