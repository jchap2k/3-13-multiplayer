import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { HOW_TO_COACH_OFFER, HOW_TO_PAGES } from "@shared/howto";
import { hasSitName, normalizeSitName } from "@shared/sitName";
import { useSitName } from "../lib/NameContext";
import { isFirstVisit } from "../lib/tutorial";
import { useTutorial } from "../lib/TutorialContext";
import { SitNameFields } from "./SitNamePrompt";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

export function HowToPlayButton({ compact = false }: { compact?: boolean }) {
  const { openHowTo } = useTutorial();
  if (compact) {
    return (
      <button
        type="button"
        onClick={openHowTo}
        className="rounded-full bg-black/35 p-2 text-amber-100 hover:bg-black/50"
        aria-label="How to play"
      >
        <BookOpen className="h-4 w-4" />
      </button>
    );
  }
  return (
    <div className="space-y-1.5">
      <Button variant="outline" onClick={openHowTo}>
        <BookOpen className="h-4 w-4" />
        How to play
      </Button>
      <p className="text-xs text-emerald-100/50">Rules + optional first-hand tips.</p>
    </div>
  );
}

export function FirstVisitCard() {
  const { prefs, openHowTo, skipTutorial } = useTutorial();
  if (!isFirstVisit(prefs)) return null;
  return (
    <section className="lobby-card rounded-3xl border border-amber-200/25 bg-amber-950/20 p-5">
      <h2 className="font-bold text-white">New to 3-13?</h2>
      <p className="mt-1 text-sm text-emerald-100/70">
        A short How to play covers deal 3→13, wilds, melds, going out, and scoring. Skip anytime if
        you already know the table. If you have no name yet, it asks for one so you can Join. In
        your own room, Join then Start — Start adds a bot if you are alone. Guests in a family room
        wait on the host. Opening How to play turns on Learning (don’t write to Stats). You can turn
        that off before Start if you want the board.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="gold" onClick={openHowTo}>
          <BookOpen className="h-4 w-4" />
          How to play
        </Button>
        <Button variant="outline" onClick={skipTutorial}>
          I know this
        </Button>
      </div>
    </section>
  );
}

export function HowToPlayDialog() {
  const { open, closeHowTo, skipTutorial, finishTutorial, prefs } = useTutorial();
  const { name, setName, commitName } = useSitName();
  const [page, setPage] = useState(0);
  const [coach, setCoach] = useState(!prefs.done);
  const [nameStep, setNameStep] = useState(false);

  useEffect(() => {
    if (open) {
      setPage(0);
      setCoach(!prefs.done);
      setNameStep(!hasSitName(name));
    }
  }, [open, prefs.done]);

  if (!open) return null;

  const last = page >= HOW_TO_PAGES.length - 1;
  const current = HOW_TO_PAGES[page];

  function close() {
    setPage(0);
    setNameStep(false);
    closeHowTo();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-3xl border border-amber-200/30 bg-[#10261c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
          {nameStep
            ? "How to play · your name"
            : `How to play · ${page + 1} of ${HOW_TO_PAGES.length}`}
        </p>
        <h2 id="howto-title" className="font-display mt-2 text-2xl font-extrabold text-white">
          {nameStep ? "What should we call you?" : current.title}
        </h2>
        {nameStep ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-emerald-50/90">
              You need a name to join. It fills the lobby field and is your Stats identity — Dad and
              dad are the same row.
            </p>
            <div className="mt-4">
              <SitNameFields
                value={name}
                onChange={setName}
                onSubmit={(next) => {
                  commitName(next);
                  setNameStep(false);
                }}
                submitLabel="Continue"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-emerald-50/90">
          {current.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {page === 0 && hasSitName(name) ? (
          <p className="mt-3 text-sm text-amber-100/80">Joining as {normalizeSitName(name)}.</p>
        ) : null}
        {last ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-3">
            <Checkbox
              label={HOW_TO_COACH_OFFER}
              checked={coach}
              onChange={(event) => setCoach(event.currentTarget.checked)}
            />
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {page > 0 ? (
            <Button variant="outline" onClick={() => setPage((n) => n - 1)}>
              Back
            </Button>
          ) : null}
          {last ? (
            <Button
              variant="gold"
              onClick={() => {
                setPage(0);
                finishTutorial(coach);
              }}
            >
              {coach ? "Play with tips" : "Got it"}
            </Button>
          ) : (
            <Button variant="gold" onClick={() => setPage((n) => n + 1)}>
              Next
            </Button>
          )}
          <button
            type="button"
            className="ml-auto text-sm font-semibold text-emerald-100/70 underline-offset-2 hover:underline"
            onClick={() => {
              setPage(0);
              setNameStep(false);
              skipTutorial();
            }}
          >
            Skip tutorial
          </button>
        </div>
          </>
        )}
        {nameStep ? (
          <button
            type="button"
            className="mt-5 text-sm font-semibold text-emerald-100/70 underline-offset-2 hover:underline"
            onClick={() => {
              setPage(0);
              setNameStep(false);
              skipTutorial();
            }}
          >
            Skip tutorial
          </button>
        ) : null}
      </div>
    </div>
  );
}
