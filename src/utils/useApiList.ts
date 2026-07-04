import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ListResponse } from "./api";

export function useApiList<T>(path: string, fallback: T[]) {
  const [data, setData] = useState<T[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<ListResponse<T>>(path)
      .then((result) => {
        if (active) setData(result.data);
      })
      .catch((apiError) => {
        if (active) setError(apiError instanceof Error ? apiError.message : "数据加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, reloadKey]);

  return { data, loading, error, setData, reload };
}
