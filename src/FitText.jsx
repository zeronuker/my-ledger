import { useEffect, useRef } from 'react'

// Shrinks font-size until text (wrapped via CSS) fits the row's fixed height
// instead of clipping — CSS caps the box height so there's never a layout
// flash before this corrects it. `className` must resolve to a rule with a
// fixed max-height + overflow:hidden (see .cat-colored / .fit-text-plain).
export default function FitText({ text, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let size = 11.5
    el.style.fontSize = `${size}px`
    while (el.scrollHeight > el.clientHeight && size > 7) {
      size -= 0.5
      el.style.fontSize = `${size}px`
    }
  }, [text])

  return <span ref={ref} className={className}>{text}</span>
}
