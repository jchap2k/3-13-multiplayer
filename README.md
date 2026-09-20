# Three Thirteen

A playable multiplayer **3-13 (Three Thirteen)** table — not Liverpool Rummy. Friends join a room with a short `WORD-NN` code or `?room=` link, sit, and play real rounds. No accounts. Bots can fill seats.

The server is the only authority: shuffle, deal, draws, meld checks, and scores all happen there.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:43133](http://127.0.0.1:43133). Share `http://127.0.0.1:43133/?room=KITE-7` with another browser (or add bots). Codes are `WORD-NN`. **`?room=PLAY-A` stays on the lobby with an error** — it does not silently open a different table.

Production-style (after `npm run build`):

```bash
npm run build
npm start
```

`PORT` defaults to `43133`.

## Play

1. Pick a **piece** (one of each at the table, like Monopoly — Cat and Tiger are both in the box) and tap **Join**. **Join** stays hittable — if you have no name yet it asks, fills the lobby field, then seats you. That sit name is your identity for **Stats** (case-insensitive: Dad and dad are the same row). Taken tokens are greyed out. Skip a pick and Start hands out a leftover. The last pick and name stay on this browser. First visit shows a **New to 3-13?** card — **How to play** or **I know this**. How to play asks for a name when the field is empty. Replay anytime from the lobby **How to play** button (book icon on the table too). The walkthrough is four short pages of locked house rules. Optional **tips on the first 5 hands** (coach overlay) suggest draws and go-outs and never play unless you tap **Do that for me**. Skip anytime. Saved as `tt-tutorial` on this browser. **Learning — don’t write to Stats** starts **off**. Opening **How to play** turns it **on**. Toggle it anytime in the lobby or on the table; it locks at Start so a mid-match flip cannot sneak the current match onto the board. When on, that seat is skipped for W–L / best / worst / stars / Hall of Fame (same as bots).
2. **Copy link** (next to Discord voice) or send the room code. The **host** can **Add bot** under the seated-names list (quiet secondary — Join and Start stay the gold pair up top). On a phone, **Add to Home Screen** installs the table as a small app.
3. Optionally roll the first dealer, toggle jokers (off by default), pick deadwood ace scoring (**15 default**, or 1), and uncheck **Caught wilds = face value** if you want leftover wilds at 15 / jokers at 20 (it starts **on**: printed face, jokers 0). Turn on **idle auto-move** if you want a 3 minute (180s) force-play. **Wager rules** start **off**. When on, the host picks the play-money starting stake (**$5 default**, or $1 / $10 / $20 / custom). Losers pay the winner, stake doubles on an all-tie, and a first-place tie goes to sudden death from deal 3. House rules lock when the host starts. Auto-move is **off** by default so humans are not forced.
4. **Start game** (host only — first to join). Gold **Join** and **Start** sit together. Alone (one human, no bots) Start auto-adds one bot (`Added a bot so you can play`) then deals. Another human or any bot already seated → no auto-add. A toast names the wild for the round (`Round 1 — 3s are wild`); the table banner keeps it visible. A top strip shows **previous / current / next**. Drag your hand to rearrange, or tap **Melds** to cluster runs and 3+ sets. After you draw: **tap a card to select, then Discard**. A second tap on the selected card **deselects** it — it does not discard. **Go out** only appears when a legal go-out discard exists — those cards are marked GO OUT. If idle auto-move is on, each human turn shows a countdown and the table plays after 3 minutes. If it is off, the table waits and only names whose turn it is. **Accessibility** (lobby card, or the accessibility icon on the table chrome) is per-browser and can change mid-hand: bigger ranks/suits, **Mark wilds on cards** (yellow ring + WILD badge, **on** by default), the turn chime, and **chat overlay while playing** start **on** for new browsers (a saved `tt-a11y` blob is not overwritten; a blob without `markWilds` stays on); optional double-tap or long-press discard (those two auto-go-out when legal).
5. Everyone else gets one last turn. Then leftover cards are scored on a full **scoreboard** (this-round + running total + per-round card). The next deal waits **12 seconds** so you can read it — or tap **Next round**. After 11 rounds, ranked standings (lowest wins) and **Back to lobby** (anyone seated; same room). If **Wager rules** is on, a unique winner gets 🏆 and each loser’s play-money owe; a first-place tie plays extra deal-3 hands until one lowest total. Mid-match the **host** can tap **End game** (with confirm) to return the same room to the lobby (no settlement). Anyone can tap **Leave room** (table chrome, or lobby once seated) to stand up and go to a new create-or-join lobby; the next human becomes host. Voice **Leave voice** is only the mic.
6. **Talk** (gold bubble, or the chat icon on the table) opens per-room text chat. **Chat overlay while playing** is an Accessibility / Talk option, **on** for new browsers. When it is on, two compact lines sit **under previous / current / next**. Uncheck it to hide the strip. Talk works either way. Names come from your seat. HTML is stripped; messages cap at 240 characters.
7. **Stats** (gold button next to Copy link) jumps to the lower lobby card: a **global board** of sit-names (W–L, 🥹 best, 😭 worst, stars, sweep glow). Tap a row for that person’s card; **Back** returns to the list. The board always shows **Hall of Fame** (all-time lowest final) and **Hall of Shame** (all-time highest loss) with who and the date. Those two lines are immortal — a personal tip-forget does not remove them. Personal **Forget this for a tip 😅** still clears that sit-name’s private card only. Tap a seated human name to open their card. Bots are never counted. A perfect sweep keeps a gold glow on that name at the table. Stats live in SQLite on the Fly volume (`/data/sit-stats.sqlite`).

## Chat and voice

- **Text is real.** Same room, same transcript, best-effort. Chat rides its own WebSocket messages so a slow chat send cannot rewrite the deal or scores. **Chat overlay while playing** (on for new browsers) adds a two-line bar under the turn strip. Talk still works either way.
- **Voice is on Discord for now.** **Join Discord voice** (lobby and Talk) opens `https://discord.gg/7cXfQJj9E` in a new tab. Override with `DISCORD_VOICE_URL` or `VITE_DISCORD_VOICE_URL`. In-app WebRTC is still parked. A local mic stub remains in Talk (this device only).

## Rules we locked

- **11 rounds**, deal 3 through 13 cards.
- **Wild rank = cards dealt that round** (round 1 → 3s, …, round 11 → Kings). **2s and Aces are never wild.**
- **Shoe = N×52**. Deck ladder: 2–3 players → 1 deck; 4–5 → 2; 6–8 → 3.
- **Jokers** are a house add-on: 2 per deck, always wild, **off** by default.
- First dealer is random among seated players, then rotates left.
- Melds stay in hand until someone goes out (gin-style). Sets are 3+ of a rank. Runs are 3+ consecutive in the same suit.
- Draw one (stock or discard), then discard. Going out means: after the draw, discard one card and the rest of the hand is valid melds.

### House calls (when sources disagree)

Documented here so the table stays consistent:

| Topic | What this table does |
| --- | --- |
| Ace in runs | High or low, **no wrap** (`A-2-3` and `Q-K-A` yes; `K-A-2` no). |
| All-wild meld | **Illegal**. A meld needs at least one natural card. |
| Going out | Must discard. Remaining cards must all meld. **Any** legal discard that leaves a melded hand goes out automatically — no extra tap. Everyone sees a “{Name} went out!” flash. |
| After a go-out | Every other player gets **one last turn** (draw + discard), continuing the **same** seating direction from the player who went out (not reversed, not restarting at the first seat). |
| Scoring leftovers | Best meld arrangement; deadwood only. **Aces default to 15**; lobby can set **Aces score 1**. 2–10=face, J/Q/K=10. **Caught wilds = face value** is **on** by default (lobby, locked at Start): leftover rank-wilds use printed face (3–10 = rank, J=11, Q=12, K=13) and **jokers score 0**. Uncheck it before Start for leftover **wild=15** / **joker=20**. 2s and Aces never use the wild score path. Play/meld legality is unchanged. The player who first went out scores **0**. |
| Stock empty | Shuffle the discard **except the face-up top card** into a new stock; the upcard stays. If only the upcard is left, stock draw is blocked — take the discard. If both piles are empty, score current deadwood (same as the 120-turn stall) and continue. |
| Idle auto-move | Lobby house option, **off** by default, locked at Start. **On:** humans get a **3 minute (180s)** countdown (`3:00`); a stall auto-plays a legal move; a disconnect uses **4s**. Hello/reconnect does not restart the clock. **Off:** no countdown and no force-play — the table waits. Bots still take their own timed turns. Separate: the **host** can check **Auto-play** next to a human name (lobby list, seat chips / fans, and the host Auto-play strip mid-match). That seat’s turns use the same bot brain until the host unchecks it or that player reconnects. |
| Bot discards | Bots never throw a round wild or a joker while any non-wild discard exists. They dump the highest deadwood natural they can. |
| Rooms | In memory. A process restart wipes tables. A brief drop (Wi‑Fi, tab refresh, phone sleep) reconnects to the **same room and seat** and restores the hand if the process stayed up — **Reconnecting…** then **You're back**. A wiped code shows **server restarted / table wiped** instead of a silent empty lobby; sit again or tap New code. The browser stores room code + player id so a refresh without `?room=` still claims the seat. |
| Stalled hand | After 120 turns with no go-out (rare, late-round bot tables), score current deadwood and deal the next round. |
| Winner | Lowest **total** after 11 rounds. **Wager off:** a first-place tie shares the table. **Wager on:** play-money chips only (never a real payment). Stake starts at **$5**; it **doubles** whenever every running total is equal (including mid-match). Losers each pay the winner: current stake, or a single multiplier if the winner finishes under 100 — **2x** if that loser is over 100, **4x** if over 200, **8x** if they are a **star victim** (one player went out first on every regulation hand, deal 3–13). Multipliers do not stack. Winner at 100+ collects only the current stake. A first-place tie starts **sudden death** at deal 3 until one unique lowest total, then the scoreboard shows 🏆 and who owes whom. Ending the match early does not settle. |
| Sit-name stats | The lobby **display name** is the identity (`Dad` / `dad` share a row). After a match the server stores humans only: wins–losses, **best** (`🥹 score — Name · date`), **worst** (`😭 score — Name · date`, losses only), first-out stars, and **perfect sweeps** (first-out all 11 regulation hands — glow even if they did not win on score). **Learning seats** (the **Learning — don’t write to Stats** toggle, default off; How to play turns it on) are skipped like bots — locked at Start. Beaten bests/worsts stay in history (“Earlier: …”). **Forget this for a tip 😅** opens Stripe; **I tipped** hides the 😭 or wipes the name (honor system). **Hall of Fame / Hall of Shame** (global best / global worst) are never removed. Partial stars do not glow. Live stats sit in SQLite on the Fly volume at `/data/sit-stats.sqlite`. |

## Public HTTPS (friends not on your LAN)

This is a single Node process with WebSockets. **Vercel is a poor fit** (no sticky realtime server). Use Fly.io, Railway, or any always-on host.

### Fly.io

```bash
fly launch --no-deploy
fly deploy
```

Public table: [https://three-thirteen.fly.dev](https://three-thirteen.fly.dev) (`/?room=KITE-7`). Health: `GET /health`.

**Support hosting** on the lobby (and match-end) opens a Stripe Checkout Payment Link in a new tab. The app never collects card data. Override with `DONATE_URL` or `VITE_DONATE_URL`; unset uses the default Stripe link. **Join Discord voice** uses `DISCORD_VOICE_URL` / `VITE_DISCORD_VOICE_URL` (health also reports `discordVoiceUrl`).

`Dockerfile` and `fly.toml` are in the repo. Rooms are in memory on **one** machine (`auto_stop_machines = "off"`, `min_machines_running = 1`). Two machines with separate memory look like a crash / empty lobby. A process stop still wipes tables. Sit-name stats persist on volume `sit_stats` mounted at `/data` (`/data/sit-stats.sqlite`).

```bash
fly deploy --app three-thirteen
fly scale count 1 --app three-thirteen
```

### Railway / render / a VPS

Build and start the same way (`npm run build && npm start`). Set `PORT` to whatever the platform injects. Terminate TLS in front of the process so the browser can use `wss://`.

## Tests

`npm test` covers meld legality, the deck ladder, and a two/three-bot hand that must finish **deal → go-out → score**, then start round 2.

## Playtest notes

See [PLAYTEST.md](./PLAYTEST.md) for friction we already know about.
