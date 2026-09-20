import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clipSitNameInput, readSitName, writeSitName } from "./sitName";

const NameContext = createContext<{
  name: string;
  setName: (raw: string) => void;
  commitName: (raw: string) => string;
}>({
  name: "",
  setName: () => undefined,
  commitName: () => "",
});

export function NameProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState(() => readSitName());

  const value = useMemo(
    () => ({
      name,
      setName: (raw: string) => {
        const clipped = clipSitNameInput(raw);
        setNameState(clipped);
        writeSitName(clipped);
      },
      commitName: (raw: string) => {
        const next = writeSitName(raw);
        setNameState(next);
        return next;
      },
    }),
    [name],
  );

  return <NameContext.Provider value={value}>{children}</NameContext.Provider>;
}

export function useSitName() {
  return useContext(NameContext);
}
