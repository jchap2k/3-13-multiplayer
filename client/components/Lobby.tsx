import { Copy, Dices, Link2, Play, Plus, Trophy, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { deckCountForPlayers } from "@shared/cards";
import { joinNeedsNamePrompt, normalizeSitName } from "@shared/sitName";
import { shouldAutoAddSoloBot } from "@shared/soloStart";
import { formatPlayMoney, STAKE_PRESETS } from "@shared/wager";
import { ROOM_CODE_HINT } from "@shared/roomCode";
import { ROOM_LOST_HINT } from "@shared/resume";
import type { ClientView } from "@shared/types";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { DiscordVoiceLink } from "./DiscordVoiceLink";
import { AutoPlayCheck, BotPlayBadge } from "./BotPlayControls";
import { CopyRoomLink } from "./CopyRoomLink";
import { AvatarPicker, SeatAvatar } from "./SeatAvatar";
import { DonateLink } from "./DonateLink";
import { SitName, playerGold } from "./SitName";
import { FirstVisitCard, HowToPlayButton } from "./HowToPlay";
import { SitNamePrompt } from "./SitNamePrompt";
import { LearningToggle } from "./LearningToggle";
import { useLearning } from "../lib/LearningContext";
import { useTutorial } from "../lib/TutorialContext";
import { scrollToStats, StatsBoard } from "./StatsSheet";
import type { AvatarId } from "@shared/avatars";
import { LeaveRoomButton } from "./LeaveRoomButton";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";

export function Lobby({
  state,
  name,
  setName,
  avatar,
  onAvatar,
  joinCode,
  setJoinCode,
  onSit,
  onAddBot,
  onRemove,
  onJokers,
  onAcePoints,
  onWildFaceValue,
  onAutoMove,
  onWagerRules,
  onWagerStake,
  onRoll,
  onStart,
  onNewRoom,
  onLeaveRoom,
  onJoinCode,
  heldInvalidCode,
  roomLost,
  onSetBotPlay,
  onForgetSitStats,
}: {
  state: ClientView;
  name: string;
  setName: (name: string) => void;
  avatar: AvatarId | null;
  onAvatar: (avatar: AvatarId) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  heldInvalidCode: string | null;
  roomLost?: boolean;
  onSit: (name?: string) => void;
  onAddBot: () => void;
  onRemove: (id: string) => void;
  onJokers: (on: boolean) => void;
  onAcePoints: (acePoints: 1 | 15) => void;
  onWildFaceValue: (wildFaceValue: boolean) => void;
  onAutoMove: (autoMove: boolean) => void;
  onWagerRules: (wagerRules: boolean) => void;
  onWagerStake: (stake: number) => void;
  onRoll: () => void;
  onStart: () => void;
  onNewRoom: () => void;
  onLeaveRoom: () => void;
  onJoinCode: () => void;
  onSetBotPlay?: (playerId: string, on: boolean) => void;
  onForgetSitStats?: (handle: string, what: "worst" | "all" | "restoreWorst") => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [statsOpen, setStatsOpen] = useState({ name: "", nonce: 0 });
  const [askName, setAskName] = useState(false);
  const { openHowTo } = useTutorial();
  const { learning, setLearning } = useLearning();

  function tryJoin() {
    if (heldInvalidCode || state.seated) return;
    if (joinNeedsNamePrompt(name)) {
      setAskName(true);
      return;
    }
    onSit(normalizeSitName(name));
  }

  const canStart =
    !heldInvalidCode &&
    state.isHost &&
    state.seated &&
    (shouldAutoAddSoloBot(state.players) || (state.players.length >= 2 && state.players.length <= 8));

  function commitJoinName(value: string) {
    const next = normalizeSitName(value);
    if (!next) return;
    setName(next);
    setAskName(false);
    onSit(next);
  }

  function openStatsList() {
    setStatsOpen({ name: "", nonce: Date.now() });
    requestAnimationFrame(() => scrollToStats());
  }

  function openStatsPerson(who: string) {
    setStatsOpen({ name: who, nonce: Date.now() });
    requestAnimationFrame(() => scrollToStats());
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}${state.joinPath}`;
  const playerCount = Math.max(state.players.length, 2);
  const decks = deckCountForPlayers(playerCount);
  const cards = decks * 52 + (state.jokers ? decks * 2 : 0);
  const summary = useMemo(
    () =>
      `${state.players.length || 0} players → ${decks}×52${state.jokers ? ` + ${decks * 2} jokers` : " (no jokers)"} = ${cards} cards. Wilds = round rank.`,
    [cards, decks, state.jokers, state.players.length],
  );

  async function copy(kind: "code" | "link") {
    const text = kind === "code" ? state.roomCode : joinUrl;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="lobby-shell min-h-dvh text-emerald-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
            Three Thirteen · not Liverpool
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Join. Deal 3 through 13.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-100/70">
            No accounts. Share the short code or link. Bots can fill empty seats so you can play a
            real match tonight.
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <DonateLink url={state.donateUrl} />
            <DiscordVoiceLink url={state.discordVoiceUrl} />
            <CopyRoomLink roomCode={heldInvalidCode ? "" : state.roomCode} disabled={Boolean(heldInvalidCode)} />
            <HowToPlayButton />
            <div className="space-y-1.5">
              <Button variant="gold" onClick={openStatsList}>
                <Trophy className="h-4 w-4" />
                Stats
              </Button>
              <p className="text-xs text-emerald-100/50">Everyone’s board. Tap a name for the card.</p>
            </div>
          </div>
        </header>

        <FirstVisitCard />

        <section className="lobby-card rounded-3xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200/80">
            Room
          </h2>
          <p
            className={`font-display mt-2 text-4xl font-extrabold tracking-[0.08em] sm:text-6xl ${
              heldInvalidCode ? "text-red-200" : "text-amber-200"
            }`}
          >
            {heldInvalidCode ?? state.roomCode}
          </p>
          {roomLost ? (
            <p className="mt-3 rounded-2xl border border-amber-300/40 bg-amber-950/50 px-3 py-2 text-sm text-amber-50">
              {ROOM_LOST_HINT}
            </p>
          ) : heldInvalidCode ? (
            <p className="mt-3 rounded-2xl border border-red-300/40 bg-red-950/50 px-3 py-2 text-sm text-red-50">
              {heldInvalidCode} is not a room code. {ROOM_CODE_HINT} This tab stayed in the lobby —
              it did not open a different table.
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-100/70">
              Host creates a room. Everyone else opens the link or types the code — no login.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="KITE-7"
              className="font-mono tracking-wider sm:max-w-[10rem]"
              aria-label="Room code"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => copy("code")} disabled={Boolean(heldInvalidCode)}>
                <Copy className="h-4 w-4" />
                {copied === "code" ? "Copied" : "Copy code"}
              </Button>
              <Button variant="secondary" onClick={onNewRoom}>
                New code
              </Button>
              <Button variant="outline" onClick={onJoinCode}>
                Join code
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-100/50">
            Codes are WORD-NN — like KITE-7. PLAY-A won’t work (needs digits after the hyphen).
          </p>
          {heldInvalidCode ? (
            <p className="mt-3 text-xs text-emerald-100/55">
              Join with a valid WORD-NN code or tap <span className="text-amber-100">New code</span>{" "}
              to mint one. Example: KITE-7.
            </p>
          ) : (
            <>
              <p className="mt-3 break-all font-mono text-xs text-emerald-100/50">{joinUrl}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => copy("link")}>
                  <Link2 className="h-3.5 w-3.5" />
                  {copied === "link" ? "Link copied" : "Copy link"}
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="lobby-card rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-300" />
            <h2 className="font-bold">Players (2–8)</h2>
          </div>
          <div className="mt-3">
            <AvatarPicker
              value={avatar}
              onChange={onAvatar}
              taken={state.players
                .filter((player) => !player.isYou && player.avatar)
                .map((player) => ({ id: player.avatar as string, name: player.name }))}
            />
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={24}
              aria-label="Display name"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="gold"
                size="lg"
                className="sm:min-w-[10rem]"
                onClick={tryJoin}
                disabled={Boolean(heldInvalidCode) || state.seated}
              >
                <UserPlus className="h-4 w-4" />
                {state.seated ? "Joined" : "Join"}
              </Button>
              {state.isHost ? (
                <Button
                  variant="gold"
                  size="lg"
                  className="sm:min-w-[10rem]"
                  onClick={onStart}
                  disabled={!canStart}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start game
                </Button>
              ) : null}
              {state.seated ? <LeaveRoomButton onLeave={onLeaveRoom} /> : null}
            </div>
            {state.isHost && shouldAutoAddSoloBot(state.players) ? (
              <p className="text-sm font-semibold text-amber-100/85">Solo? Start adds a bot.</p>
            ) : null}
          </div>
          <SitNamePrompt
            open={askName}
            name={name}
            onName={setName}
            onCommit={commitJoinName}
            onHowTo={() => {
              setAskName(false);
              openHowTo();
            }}
            submitLabel="Join"
          />
          <div className="mt-3">
            <LearningToggle checked={learning} onChange={setLearning} />
          </div>
          {state.seated && state.players.find((player) => player.isYou)?.learning ? (
            <p className="mt-2 text-xs text-amber-100/75">
              Learning is on — this match will not write W–L, best/worst, or stars. Turn it off
              before Start if you want the Stats board.
            </p>
          ) : null}
          <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
            {state.players.length === 0 ? (
              <li className="px-3 py-4 text-sm text-emerald-100/50">No one seated yet.</li>
            ) : (
              state.players.map((player) => (
                <li key={player.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <SeatAvatar avatar={player.avatar} seatIndex={player.seatIndex} initials={player.name} size="sm" />
                    <SitName
                      name={player.name}
                      goldGlow={playerGold(player)}
                      className="font-semibold text-white"
                      onOpen={
                        player.isBot
                          ? undefined
                          : () => openStatsPerson(player.name)
                      }
                    />
                    {player.isYou ? " · you" : ""}
                    {player.learning && !player.isBot ? " · learning" : ""}
                    {player.isBot ? " · bot" : ""}
                    {!player.isBot && !player.connected ? " · away" : ""}
                    {state.dealerId === player.id ? " · dealer" : ""}
                    {state.hostId === player.id ? " · host" : ""}
                    <BotPlayBadge player={player} />
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {state.isHost && onSetBotPlay && !player.isBot ? (
                      <AutoPlayCheck player={player} onToggle={onSetBotPlay} />
                    ) : null}
                    {state.phase === "lobby" && (player.isBot || player.isYou) ? (
                      <button
                        className="text-xs text-emerald-100/50 underline"
                        onClick={() => onRemove(player.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </span>
                </li>
              ))
            )}
          </ul>
          {state.isHost ? (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onAddBot}
                disabled={Boolean(heldInvalidCode)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add bot
              </Button>
            </div>
          ) : null}

          <div className="mt-4 text-emerald-50">
            <Checkbox
              label="House: add jokers (2 per deck) as extra permanent wilds"
              checked={state.jokers}
              disabled={Boolean(heldInvalidCode)}
              onChange={(e) => onJokers(e.currentTarget.checked)}
            />
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-100/80">Deadwood aces</p>
            <p className="mt-1 text-xs text-emerald-100/50">
              Aces high or low in runs (A-2-3 or Q-K-A; no K-A-2 wrap). Sets of aces are fine. These
              buttons only change leftover ace <span className="text-emerald-100/80">points</span>.
              Locked when the host starts. Caught wilds and jokers use the house option below.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={state.acePoints === 15 ? "gold" : "outline"}
                disabled={Boolean(heldInvalidCode)}
                onClick={() => onAcePoints(15)}
              >
                Aces score 15 (default)
              </Button>
              <Button
                size="sm"
                variant={state.acePoints === 1 ? "gold" : "outline"}
                disabled={Boolean(heldInvalidCode)}
                onClick={() => onAcePoints(1)}
              >
                Aces score 1
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-100/80">Caught wilds</p>
            <p className="mt-1 text-xs text-emerald-100/50">
              On (default): leftover rank-wilds use printed face value (3–10 = rank, J=11, Q=12,
              K=13). Jokers score 0. Off: leftover rank-wilds score 15, jokers score 20. 2s and
              Aces are never wild. Play and meld rules stay the same — this is points only.
              Locked when the host starts.
            </p>
            <div className="mt-2 text-emerald-50">
              <Checkbox
                label="Caught wilds = face value"
                checked={state.wildFaceValue}
                disabled={Boolean(heldInvalidCode)}
                onChange={(e) => onWildFaceValue(e.currentTarget.checked)}
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-100/80">Idle auto-move</p>
            <p className="mt-1 text-xs text-emerald-100/50">
              Off by default so humans are not forced. Locked when the host starts. Bots still play on their own clock.
            </p>
            <div className="mt-2 text-emerald-50">
              <Checkbox
                label="On: 3 minute (180s) countdown, then the table plays a legal move if a human stalls"
                checked={state.autoMove}
                disabled={Boolean(heldInvalidCode)}
                onChange={(e) => onAutoMove(e.currentTarget.checked)}
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-100/80">Wager rules</p>
            <p className="mt-1 text-xs text-emerald-100/50">
              Off by default. Play-money chips only — fake money, never a real payment. Losers each
              pay the winner. Stake starts at {formatPlayMoney(state.wagerStake)} (host can change it
              below) and doubles when every running total is tied. Multipliers (over 100, over 200,
              or a perfect-sweep star) apply only if the winner finishes under 100. A first-place
              tie plays sudden death from deal 3. Locked when the host starts.
            </p>
            <div className="mt-2 text-emerald-50">
              <Checkbox
                label={`On: play-money wager — ${formatPlayMoney(state.wagerStake)} start, losers pay the winner`}
                checked={state.wagerRules}
                disabled={Boolean(heldInvalidCode)}
                onChange={(e) => onWagerRules(e.currentTarget.checked)}
              />
            </div>
            {state.wagerRules ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-sm font-semibold text-emerald-100/80">Starting stake</p>
                <p className="mt-1 text-xs text-emerald-100/50">
                  Play money only. Locks at Start. Doubles still happen on an all-tie.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STAKE_PRESETS.map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant={state.wagerStake === amount ? "gold" : "outline"}
                      disabled={Boolean(heldInvalidCode)}
                      onClick={() => onWagerStake(amount)}
                    >
                      {formatPlayMoney(amount)}
                    </Button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-emerald-100/50">Custom</span>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    aria-label="Custom starting stake"
                    className="h-8 w-24"
                    value={state.wagerStake}
                    disabled={Boolean(heldInvalidCode)}
                    onChange={(e) => onWagerStake(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRoll} disabled={Boolean(heldInvalidCode)}>
              <Dices className="h-4 w-4" />
              {state.dealerName ? "Re-roll" : "Pick first dealer"}
            </Button>
          </div>
          {heldInvalidCode ? (
            <p className="mt-2 text-sm text-amber-100/80">
              Fix the room code before joining. Only the host (first to join) starts a valid table.
            </p>
          ) : state.seated && !state.isHost ? (
            <p className="mt-2 text-sm text-amber-100/80">
              Only the host (first to join) can start. Waiting on{" "}
              {state.players.find((player) => player.id === state.hostId)?.name ?? "the host"}.
            </p>
          ) : !state.seated ? (
            <p className="mt-2 text-sm text-emerald-100/55">
              Join to claim the table. The first to join is the host and starts the game.
            </p>
          ) : shouldAutoAddSoloBot(state.players) ? (
            <p className="mt-2 text-sm text-emerald-100/55">
              You’re the only one here. Start adds one bot so you can learn the table.
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-100/55">
              You’re the host (first to join). Start when the seats you want are filled.
            </p>
          )}
          {state.dealerName ? (
            <p className="mt-3 text-lg font-bold text-white">First dealer: {state.dealerName}</p>
          ) : (
            <p className="mt-3 text-sm text-emerald-100/50">Dealer is rolled at start if you skip this.</p>
          )}
          <p className="mt-2 text-sm text-emerald-100/65">{summary}</p>
        </section>

        <section id="stats" className="lobby-card scroll-mt-4 rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            <h2 className="font-bold">Stats</h2>
          </div>
          <p className="mt-1 text-sm text-emerald-100/60">
            Everyone who has sat and finished a match. Tap a name for the full card —{" "}
            <span className="text-amber-100">Back</span> returns here. 🥹 Hall of Fame and 😭 Hall of
            Shame are immortal; a personal tip-forget only clears that sit-name’s card. Dad and dad
            are the same row. Bots never write a row. Gold glow only after first-out on all 11
            regulation hands.
          </p>
          <div className="mt-4">
            <StatsBoard
              sitStats={state.sitStats ?? []}
              sitGlobal={state.sitGlobal ?? { best: null, worst: null }}
              seatedNames={state.players.filter((player) => !player.isBot).map((player) => player.name)}
              initialName={statsOpen.name}
              openNonce={statsOpen.nonce}
              isHost={state.isHost}
              seated={state.seated}
              donateUrl={state.donateUrl}
              onForget={onForgetSitStats}
              onBack={() => setStatsOpen({ name: "", nonce: Date.now() })}
            />
          </div>
        </section>

        <AccessibilityPanel />
      </div>
    </div>
  );
}
