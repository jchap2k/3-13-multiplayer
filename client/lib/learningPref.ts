import { LEARNING_STORAGE_KEY, parseLearningFlag } from "@shared/learning";

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadLearning(raw?: string | null): boolean {
  const source = raw !== undefined ? raw : storage()?.getItem(LEARNING_STORAGE_KEY);
  return parseLearningFlag(source);
}

export function saveLearning(learning: boolean) {
  storage()?.setItem(LEARNING_STORAGE_KEY, learning ? "1" : "0");
}
