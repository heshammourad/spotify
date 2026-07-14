import { useEffect, DependencyList } from "react";

/**
 * A custom hook to run a data-fetching callback inside a useEffect.
 * This centralizes the set-state-in-effect suppression in a single place.
 */
export function useFetchData(callback: () => void | Promise<void>, deps: DependencyList = []) {
  useEffect(() => {
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
