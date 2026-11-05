import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and tracks { data, loading, error }. Re-runs when `deps` change, and
 * ignores answers that arrive after a newer request was started (no stale results).
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const counter = useRef(0)

  const run = useCallback(() => {
    const id = ++counter.current
    setState((s) => ({ ...s, loading: true, error: null }))
    loader()
      .then((data) => {
        if (id === counter.current) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (id === counter.current) setState({ data: null, loading: false, error })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
    return () => {
      counter.current++
    }
  }, [run])

  return { ...state, reload: run }
}
