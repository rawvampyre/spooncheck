# spooncheck

osrs luck, wrapped. enter your big grinds (or auto fill from your account),
the math decides how spooned your account is, and you get a Spotify-Wrapped
style reveal with your top spoons, deepest fries, and an overall verdict to
share.

## run it locally

```
node serve.mjs
```

then open http://localhost:8717

## deploy

it's a fully static site (no build step, no backend). push to GitHub and
turn on GitHub Pages for the repo root, or drop the folder on any static
host. the two data apis (wise old man + wikisync) are called straight from
the browser and both allow cross-origin requests.

## auto fill sources

- **wise old man** (`api.wiseoldman.net`) — boss kill counts and clue casket
  counts. if the account isn't tracked yet the lookup asks WOM to fetch it
  off the hiscores first.
- **wikisync** (`sync.runescape.wiki`) — which collection log slots the
  account owns. only present if the player runs the WikiSync RuneLite
  plugin and has synced their collection log in game. an unsynced log means
  ownership stays unknown (never assumed dry).

drop-kc caveat: the collection log doesn't record what kc an item dropped
at, so for owned items the auto fill uses current kc and the player should
lower it to the real drop kc if they remember.

## how the math works

each grind becomes a luck score in (0,1) where 1 = spooned, 0.5 = average,
0 = fried (see `math.js` for the exact treatment of gets vs still-dry
censoring). the overall verdict converts the mean of those scores into a
percentile against a perfectly-average account via the CLT.

## tuning

- `items.js` — the grind list, drop rates, WOM metrics, collection log ids
- `math.js` — verdict labels and thresholds
- `app.js` — `CONFIG` at the top holds the handle/twitch plug
