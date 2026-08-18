import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

// One doc per category+month (docId = `${categoryId}_${month}`) — the
// Expenses grid is a true budget sheet, not a transaction ledger, so
// there's exactly one number per cell, never a list to sum.
export function useExpenseEntries(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const colRef = collection(db, 'users', uid, 'expenseEntries')
    const unsub = onSnapshot(colRef, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid])

  // Blank/zero clears the cell entirely (including paid status) rather
  // than storing a 0 row. merge:true on the write path so editing the
  // amount of an already-paid cell doesn't wipe its paid flag.
  function setEntry(categoryId, month, amount) {
    const ref = doc(db, 'users', uid, 'expenseEntries', `${categoryId}_${month}`)
    if (!amount || Number(amount) === 0) {
      deleteDoc(ref)
    } else {
      setDoc(ref, { categoryId, month, amount: Number(amount) }, { merge: true })
    }
  }

  function setPaid(categoryId, month, paid) {
    const ref = doc(db, 'users', uid, 'expenseEntries', `${categoryId}_${month}`)
    setDoc(ref, { paid }, { merge: true })
  }

  return { items, loading, setEntry, setPaid }
}
