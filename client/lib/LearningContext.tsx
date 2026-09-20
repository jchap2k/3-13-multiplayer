import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { loadLearning, saveLearning } from "./learningPref";

const LearningContext = createContext<{
  learning: boolean;
  setLearning: (on: boolean) => void;
  enableLearning: () => void;
}>({
  learning: false,
  setLearning: () => undefined,
  enableLearning: () => undefined,
});

export function LearningProvider({ children }: { children: ReactNode }) {
  const [learning, setLearningState] = useState(() => loadLearning());

  const value = useMemo(
    () => ({
      learning,
      setLearning: (on: boolean) => {
        const next = Boolean(on);
        saveLearning(next);
        setLearningState(next);
      },
      enableLearning: () => {
        saveLearning(true);
        setLearningState(true);
      },
    }),
    [learning],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  return useContext(LearningContext);
}
