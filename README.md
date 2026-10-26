# Commander Forge

A Magic: The Gathering **Commander deckbuilder** you host yourself. Pick a commander, a gameplan, a bracket and a budget, and it recommends cards with a write-up on why each one fits, using live data from Scryfall, EDHREC, Commander Spellbook and MTGJSON. Then export straight to Archidekt or Moxfield.

## What it does

- **New deck or import.** Start from a commander (with type-ahead search of all 3,500 legal commanders), paste a Moxfield or Archidekt list, or load any of 200 official precons.
- **Gameplans** come from EDHREC's real themes for your commander, with deck counts and descriptions. When you import a deck, each gameplan also says how much your deck already plays that way.
- **Brackets 1–5.** Game Changer limits, mass land denial, extra turns and two-card combos are enforced, with a live bracket check.
- **Budget.** Recommendations aim at your budget, and every card has an upgrade and a budget alternative. Cards you own don't count toward the budget.
- **Synergy write-ups** for every card, plus EDHREC inclusion and synergy numbers, live prices and rules text.
- **Combos** from Commander Spellbook: combos already in your deck and ones you're one card away from.
- **Playtest:** plays turns 1–6 of up to 5,000 games, scores the deck, and suggests specific swaps.
- **Mana check:** compares your spells' colors to your mana sources.
- **"Anything you'd like to see added?"** Ask in plain words ("more ramp", "a couple of expensive upgrades") and review the adds and cuts before applying.
- **My collection:** upload an Excel or CSV export of your cards, add and remove cards over time, and the builder marks what you own and gives you a shopping list for the rest.

## Install on Unraid

1. In Unraid, open **Docker → Add Container**.
2. In **Template**, paste this URL into the template box (or choose *commander-forge* if it's already listed under user templates):
   `https://raw.githubusercontent.com/YSLBoatBoy/commander-forge/main/unraid/commander-forge.xml`
3. Leave the defaults (port **8790**, app data in `/mnt/user/appdata/commander-forge`) and click **Apply**.
4. Open `http://YOUR-SERVER-IP:8790`.
5. In the right-hand column, open **AI engine**, choose **Google Gemini** or **Claude (API key)**, paste your key and click **Save and test**.
   - Free Gemini key: <https://aistudio.google.com/apikey>
   - Anthropic key (pay per use): <https://console.anthropic.com/settings/keys>

### Without Unraid

```sh
docker run -d --name commander-forge -p 8790:8790 \
  -v /path/to/data:/data --restart unless-stopped \
  ghcr.io/yslboatboy/commander-forge:latest
```

Or with Node 22.13+ and no Docker: `npm start` (data goes in `./data`).

## Settings

| Setting | What it does |
|---|---|
| `GEMINI_API_KEY` | Google Gemini key. Optional; you can paste it in the app instead. |
| `ANTHROPIC_API_KEY` | Anthropic key, to use Claude instead. Optional. |
| `AI_PROVIDER` | `gemini` or `anthropic`. Optional; you can switch in the app. |
| `APP_PASSWORD` | Optional. Asks for this password before opening the app. |
| `PORT` | Port inside the container. Default `8790`. |
| `DATA_DIR` | Where the database lives. Default `/data`. |

Keys set as environment variables take priority over keys saved in the app. Keys are only ever stored on your server; the page shows the last four characters at most.

## Your data

Everything lives in one SQLite file: `/mnt/user/appdata/commander-forge/commander-forge.db`. It holds your collection, saved builds, AI settings and a cache of card data. It's included in normal appdata backups, and updates never touch it.

## Updating

Every push to `main` is tested and published as `ghcr.io/yslboatboy/commander-forge:latest`. On Unraid, go to **Docker**, click **Check for updates**, then **Apply update**. (Or install Watchtower to do it automatically.)

## Privacy and network

The server only contacts: `api.scryfall.com`, `json.edhrec.com`, `backend.commanderspellbook.com`, `mtgjson.com`, and whichever AI service you choose. Card data requests are limited to those four hosts and cached, so the server can't be used to reach anything else on your network.

## Development

```sh
npm test                 # server and deck-logic tests
npm start                # http://localhost:8790
npm run build:artifact   # single-file version that runs inside Claude
```

See `CLAUDE.md` for how the code is organized.

Card data © Wizards of the Coast. Commander Forge isn't affiliated with Wizards of the Coast, Scryfall, EDHREC, Commander Spellbook or MTGJSON.
