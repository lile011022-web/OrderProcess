import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, type ListResponse } from "./api";

type UseApiListOptions = {
  showFallbackWhileLoading?: boolean;
  useFallbackOnError?: boolean;
};

export function useApiList<T>(path: string, fallback: T[], options: UseApiListOptions = {}) {
  const { showFallbackWhileLoading = false, useFallbackOnError = true } = options;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const [data, setData] = useState<T[]>(showFallbackWhileLoading ? fallback : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(showFallbackWhileLoading ? fallbackRef.current : []);
    apiRequest<ListResponse<T>>(path)
      .then((result) => {
        if (active) setData(result.data);
      })
      .catch((apiError) => {
        if (!active) return;
        setError(apiError instanceof Error ? apiError.message : "数据加载失败");
        setData(useFallbackOnError ? fallbackRef.current : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, reloadKey, showFallbackWhileLoading, useFallbackOnError]);

  return { data, loading, error, setData, reload };
}
