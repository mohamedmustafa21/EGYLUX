import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

// GET بسيط مع loading / error / reload — path = null يوقف الطلب
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const seq = useRef(0);
  const load = useCallback(() => {
    if (!path) return;
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path).then(
      (data) => n === seq.current && setState({ data, error: null, loading: false }),
      (error) => n === seq.current && setState({ data: null, error, loading: false })
    );
  }, [path, ...deps]); // eslint-disable-line
  useEffect(load, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}
