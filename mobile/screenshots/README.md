# OASIS app screenshots

iPhone 16 mockups of every screen in the app, in the Ultramarine finish.

| Folder | What | Size |
| --- | --- | --- |
| `posters/` | App Store-style posters with a headline (6.9" size, ready to upload) | 1290 × 2796 |
| `framed/` | The phone on its own, transparent background, for decks and the website | ~950 × 1880 |
| `showcase.png` | Five phones side by side, for a website hero or social post | 3200 × 1800 |
| `raw/` | Bare screens, no frame (not committed - regenerate below) | 1179 × 2556 |

Screens: welcome (3 slides), sign in, sign up, forgot password, school pending
approval, home, students, add student, attendance, messages, more, fees,
timetable, school setup, reporting, calendar, account, class register, bulk tools,
staff, school registration (details, modules, documents & data), import students
& parents, join the OASIS team, and the developer console (requests, application,
files, people & access, decision, school admins, developers & keys).

Signed-in screens use the app's demo mode (the OASIS Demo School snapshot), so
no real school's data appears. Console screens add `as=developer`, which shows
made-up registrations (Sunrise Hill, Lakeview…).

## Regenerating

From `mobile/`:

```bash
npx expo export --platform web --output-dir ../.web-build
node <any static server> ../.web-build 8090        # e.g. npx serve -s -l 8090 ../.web-build
node screenshots/capture.js http://127.0.0.1:8090  # -> raw/
node screenshots/mockups.js                        # -> framed/, posters/, showcase.png
```

`capture.js` drives headless Edge/Chrome at 393×852pt @3x. The web build
honours `?device=iphone16` (iPhone 16 safe areas, exact viewport) and
`?demo=1`; both are web-only and never affect the native app. Captions live in
`CAPTIONS` in `mockups.js`.
