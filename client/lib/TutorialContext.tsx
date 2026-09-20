import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_TUTORIAL,
  loadTutorial,
  saveTutorial,
  type TutorialPrefs,
} from "./tutorial";
import { useLearning } from "./LearningContext";

const TutorialContext = createContext<{
  prefs: TutorialPrefs;
  open: boolean;
  openHowTo: () => void;
  closeHowTo: () => void;
  patch: (partial: Partial<TutorialPrefs>) => void;
  skipTutorial: () => void;
  finishTutorial: (coach: boolean) => void;
}>({
  prefs: DEFAULT_TUTORIAL,
  open: false,
  openHowTo: () => undefined,
  closeHowTo: () => undefined,
  patch: () => undefined,
  skipTutorial: () => undefined,
  finishTutorial: () => undefined,
});

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<TutorialPrefs>(() => loadTutorial());
  const [open, setOpen] = useState(false);
  const { enableLearning } = useLearning();

  const value = useMemo(
    () => ({
      prefs,
      open,
      openHowTo: () => {
        enableLearning();
        setOpen(true);
      },
      closeHowTo: () => setOpen(false),
      patch: (partial: Partial<TutorialPrefs>) => {
        setPrefs((prev) => {
          const next = { ...prev, ...partial };
          saveTutorial(next);
          return next;
        });
      },
      skipTutorial: () => {
        const next = { done: true, coach: false };
        saveTutorial(next);
        setPrefs(next);
        setOpen(false);
      },
      finishTutorial: (coach: boolean) => {
        const next = { done: true, coach };
        saveTutorial(next);
        setPrefs(next);
        setOpen(false);
      },
    }),
    [prefs, open, enableLearning],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  return useContext(TutorialContext);
}
