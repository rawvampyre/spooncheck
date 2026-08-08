# spooncheck

osrs luck, wrapped. a guided, chipper, corporate-onboarding-style flow
walks you through the RNG grinds of the actual Ladlor progression chart
(ladlorchart.com), era by era: import your account, review each section,
submit for assessment, and get a Spotify-Wrapped style reveal with your
top spoons, deepest fries, and an importance-weighted overall verdict to
share.

## run it locally

```
node serve.mjs
```

then open http://localhost:8717

## deploy (the non-sketchy way)

it's a fully static site (no build step, no backend, no tracking). push
the repo to GitHub public and turn on GitHub Pages: repo Settings > Pages >
deploy from branch `main` root. the tool then lives on a `*.github.io`
url, which is the trust standard for osrs community tools (the ladlor
chart itself is hosted this way) because anyone can read the source. post
the full url, never a link shortener. the one data api (wise old man) is
called straight from the browser and allows cross-origin requests, so
there is genuinely no server anywhere.

## auto fill

**wise old man** (`api.wiseoldman.net`) — boss kill counts, clue casket
counts, and section numbers like total toa raids. if the account isn't
tracked yet the lookup asks WOM to fetch it off the hiscores first.
got or dry is always answered by the player.

## how the math works

each grind becomes a luck score in (0,1) where 1 = spooned, 0.5 = average,
0 = fried (see `math.js` for the exact treatment of gets vs still-dry
censoring). the overall verdict converts the mean of those scores into a
percentile against a perfectly-average account via the CLT.

## tuning

- `items.js` — the grind list, drop rates, WOM metrics, collection log ids
- `math.js` — verdict labels and thresholds
- `app.js` — `CONFIG` at the top holds the handle/twitch plug

## disclaimer

spooncheck is a fan-made tool. it is not affiliated with jagex. game
assets and drop rates belong to their respective owners, rates are
sourced from the osrs wiki.

