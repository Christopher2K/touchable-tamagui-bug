import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react'
import {
  debounce,
  isWeb,
  useDebounce,
  useDebounceValue,
  useEvent,
  useWindowDimensions,
} from 'tamagui'

type DisposeFn = () => void

type IntersectCallback = (
  props: (IntersectionObserverEntry | null)[],
  didResize?: boolean
) => DisposeFn | void | null

type HTMLRef = MutableRefObject<HTMLElement | null>

export function useIsIntersecting<Ref extends HTMLRef | HTMLRef[]>(
  refs: Ref,
  { once, ...opts }: IntersectionObserverInit & { once?: boolean } = {}
): Ref extends any[] ? boolean[] : boolean {
  const [values, setValues] = useState<boolean[]>([])

  if (isWeb) {
    useOnIntersecting(
      refs,
      (entries) => {
        const intersecting = entries.some((x) => x?.isIntersecting)
        if (once && !intersecting) return
        setValues((prev) => {
          const next = entries.map((e) => e?.isIntersecting ?? false)
          if (prev.length === next.length && prev.every((e, i) => e === next[i])) {
            return prev
          }
          return next
        })
      },
      opts
    )
  }

  return (Array.isArray(refs) ? values : values[0]) as any
}

export function useOnIntersecting<Ref extends HTMLRef | HTMLRef[]>(
  refsIn: Ref,
  incomingCbRaw: IntersectCallback,
  { threshold = 1, root, rootMargin }: IntersectionObserverInit = {
    threshold: 1,
  },
  mountArgs: any[] = []
) {
  const onIntersectEvent = useEvent(incomingCbRaw)
  const windowDimensions = useDebounceValue(useWindowDimensions())

  useEffect(() => {
    const refs = (Array.isArray(refsIn) ? refsIn : [refsIn]) as HTMLRef[]
    if (!refs.length) return

    let dispose: DisposeFn | null = null
    let currentEntries: (IntersectionObserverEntry | null)[] = []
    const options = {
      threshold,
      root,
      rootMargin,
    }
    const io = new IntersectionObserver((entries) => {
      currentEntries = refs.map((ref, index) => {
        return entries.find((x) => x.target === ref.current) ?? currentEntries[index] ?? null
      })
      dispose?.()
      dispose = onIntersectEvent(currentEntries) || null
    }, options)

    for (const ref of refs) {
      if (ref.current) {
        io.observe(ref.current)
      }
    }

    return () => {
      dispose?.()
      io.disconnect()
    }
  }, [
    windowDimensions,
    onIntersectEvent,
    refsIn,
    root,
    rootMargin,
    threshold,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...mountArgs,
  ])
}
