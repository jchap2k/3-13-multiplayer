import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_A11Y, loadA11y, saveA11y, type A11yPrefs } from "./a11y";
import { unlockTurnAudio } from "./turnSound";

const A11yContext = createContext<{
  prefs: A11yPrefs;
  patch: (partial: Partial<A11yPrefs>) => void;
}>({
  prefs: DEFAULT_A11Y,
  patch: () => undefined,
});

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => loadA11y());
  useEffect(() => {
    const unlock = () => unlockTurnAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  const value = useMemo(
    () => ({
      prefs,
      patch: (partial: Partial<A11yPrefs>) => {
        setPrefs((prev) => {
          const next = { ...prev, ...partial };
          saveA11y(next);
          return next;
        });
      },
    }),
    [prefs],
  );
  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  return useContext(A11yContext);
}
