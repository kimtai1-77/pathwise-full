import { useEffect } from 'react'

let activeScrollLocks = 0
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''
let previousDocumentOverflow = ''

export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined

    const body = document.body
    const root = document.documentElement

    if (activeScrollLocks === 0) {
      previousBodyOverflow = body.style.overflow
      previousBodyPaddingRight = body.style.paddingRight
      previousDocumentOverflow = root.style.overflow

      const scrollbarWidth = window.innerWidth - root.clientWidth
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
      body.style.overflow = 'hidden'
      root.style.overflow = 'hidden'
    }

    activeScrollLocks += 1
    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1)
      if (activeScrollLocks === 0) {
        body.style.overflow = previousBodyOverflow
        body.style.paddingRight = previousBodyPaddingRight
        root.style.overflow = previousDocumentOverflow
      }
    }
  }, [locked])
}