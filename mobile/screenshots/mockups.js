// Turns screenshots/raw/*.png into iPhone 16 mockups:
//   framed/   phone only, transparent background (2x)
//   posters/  App Store-style poster with headline (1290x2796)
//   showcase.png  five phones side by side
// Usage: node screenshots/mockups.js   (after capture.js)
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const RAW = path.join(ROOT, "raw");
const REPO = path.resolve(ROOT, "..", "..");
const FONT = path.join(REPO, "public", "fonts", "grenette-regular-pro.ttf").replace(/\\/g, "/");
const LOGO = path.join(REPO, "public", "images", "logo.png").replace(/\\/g, "/");
const BROWSER = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((b) => fs.existsSync(b));
const fileUrl = (p) => "file:///" + p.replace(/\\/g, "/");

const CAPTIONS = {
  "01-welcome-1": ["Your whole school,", "in your pocket"],
  "02-welcome-2": ["Attendance", "in seconds"],
  "03-welcome-3": ["Always in sync", "with the web"],
  "04-sign-in": ["Pick your school,", "sign in securely"],
  "05-sign-up": ["Set up your school", "in minutes"],
  "06-forgot-password": ["Locked out?", "Reset with a code"],
  "07-pending-approval": ["Every school", "verified by OASIS"],
  "08-home": ["Today at a glance,", "every morning"],
  "09-students": ["Every student,", "one tap away"],
  "10-add-student": ["Enrol a student", "from anywhere"],
  "11-attendance": ["Registers that", "take seconds"],
  "12-messages": ["Message parents,", "staff and students"],
  "13-more-modules": ["20+ modules,", "one app"],
  "14-fees": ["Fees and invoices,", "always up to date"],
  "15-timetable": ["The timetable,", "in your pocket"],
  "16-school-setup": ["Set up classes,", "subjects and more"],
  "17-reporting": ["Live reports,", "real numbers"],
  "18-calendar": ["Never miss", "a school event"],
  "19-account": ["Your account,", "your way"],
  "20-class-register": ["A whole class register", "in one tap"],
  "21-bulk-add-students": ["Add a whole class", "in seconds"],
  "22-invoice-a-class": ["Invoice every student", "at once"],
  "23-staff-and-teaching": ["Add staff, assign", "who teaches what"],
  "24-join-as-staff": ["Teachers join with", "the email you added"],
  "25-register-school": ["Tell us about", "your school"],
  "26-register-profile": ["Everything OASIS", "needs, step by step"],
  "27-register-modules": ["Choose the modules", "you want"],
  "28-register-documents-data": ["Upload documents", "and your school's data"],
  "29-import-students-parents": ["Students and parents,", "imported together"],
  "30-join-oasis-team": ["Developers join", "the OASIS team"],
  "31-console-requests": ["Every onboarding", "request in one inbox"],
  "32-console-application": ["Read the full", "application"],
  "33-console-files": ["Open every file", "a school sends"],
  "34-console-people-access": ["Add admins,", "remove access"],
  "35-console-decision": ["Approve, ask for more,", "or reject"],
  "36-console-school-admins": ["Every school admin,", "in one place"],
  "37-console-developers-keys": ["Developers", "and keys"],
};

// iPhone 16 in points: 393x852 screen, ~21pt frame, 55pt screen corners.
const PHONE_CSS = `
.phone { position: relative; width: 435px; height: 894px; }
.btn { position: absolute; width: 5px; border-radius: 3px; background: linear-gradient(90deg, #7f8fd8, #b9c4fb 50%, #7f8fd8); }
.btn.l { left: -3px; } .btn.r { right: -3px; }
.body { position: absolute; inset: 0; border-radius: 72px; padding: 4px;
  background: linear-gradient(145deg, #c3ccfb 0%, #8e9eea 22%, #b7c2fa 48%, #7c8bdc 74%, #aeb9f6 100%);
  box-shadow: inset 0 0 2px rgba(255,255,255,.9), inset 0 0 0 1px rgba(60,70,150,.35); }
.bezel { position: absolute; inset: 4px; border-radius: 68px; background: #07070b; }
.screen { position: absolute; inset: 21px; border-radius: 55px; overflow: hidden; background: #f6f6fb; }
.screen img { width: 393px; height: 852px; display: block; }
.island { position: absolute; top: 11px; left: 50%; width: 126px; height: 37px; margin-left: -63px; border-radius: 20px; background: #000; }
.status { position: absolute; top: 0; left: 0; right: 0; height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 6px 34px 0 52px; font: 600 17px -apple-system, "SF Pro Text", "Segoe UI", sans-serif; color: #000; letter-spacing: -.3px; }
.status .icons { display: flex; gap: 6px; align-items: center; }
.home { position: absolute; bottom: 8px; left: 50%; width: 139px; height: 5px; margin-left: -69.5px; border-radius: 3px; background: rgba(0,0,0,.85); }
`;

const STATUS_ICONS = `
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .9 10.4 10.4 0 0 0 .6 3.9l1.2 1.2A8.7 8.7 0 0 1 8 2.6Zm0 3.4c1.5 0 2.9.6 4 1.6l1.2-1.2A7.3 7.3 0 0 0 8 4.3a7.3 7.3 0 0 0-5.2 2.1L4 7.6c1.1-1 2.5-1.6 4-1.6Zm0 3.3c.7 0 1.3.3 1.8.7L8 11.8 6.2 10c.5-.4 1.1-.7 1.8-.7Z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".5"/></svg>`;

function phone(shot) {
  return `<div class="phone">
    <div class="btn l" style="top:190px;height:34px"></div>
    <div class="btn l" style="top:252px;height:62px"></div>
    <div class="btn l" style="top:326px;height:62px"></div>
    <div class="btn r" style="top:278px;height:100px"></div>
    <div class="btn r" style="top:540px;height:66px;opacity:.85"></div>
    <div class="body"><div class="bezel"></div></div>
    <div class="screen">
      <img src="${fileUrl(path.join(RAW, shot + ".png"))}">
      <div class="status"><span>9:41</span><span class="icons">${STATUS_ICONS}</span></div>
      <div class="island"></div>
      <div class="home"></div>
    </div>
  </div>`;
}

const BASE_CSS = `
@font-face { font-family: Grenette; src: url("${fileUrl(FONT)}"); }
* { box-sizing: border-box; } html, body { margin: 0; }
${PHONE_CSS}`;

const BACKDROP = `
background: radial-gradient(circle at 10% 8%, rgba(166,169,247,.55), transparent 40%),
  radial-gradient(circle at 92% 35%, rgba(201,184,255,.45), transparent 38%),
  radial-gradient(circle at 20% 95%, rgba(240,201,255,.5), transparent 40%),
  linear-gradient(160deg, #f3f1ff, #fbfaff 50%, #eef0ff);`;

function render(html, out, width, height, { transparent = false, scale = 1 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-mock-"));
  const page = path.join(dir, "page.html");
  fs.writeFileSync(page, html);
  if (fs.existsSync(out)) fs.rmSync(out);
  const args = [
    "--headless=old",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--user-data-dir=${path.join(dir, "profile")}`,
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${scale}`,
    "--virtual-time-budget=4000",
    `--screenshot=${out}`,
  ];
  if (transparent) args.push("--default-background-color=00000000");
  execFileSync(BROWSER, [...args, fileUrl(page)], { stdio: "ignore", timeout: 60_000 });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !(fs.existsSync(out) && fs.statSync(out).size > 0)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

const shots = fs.readdirSync(RAW).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, "")).sort();
const only = process.argv[2];
fs.mkdirSync(path.join(ROOT, "framed"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "posters"), { recursive: true });

for (const shot of shots) {
  if (only && !shot.includes(only)) continue;
  // Phone only, transparent, 2x (≈ 900x1820 incl. shadow room).
  render(
    `<html><head><style>${BASE_CSS} body{background:transparent;padding:16px 20px 30px}</style></head><body>${phone(shot)}</body></html>`,
    path.join(ROOT, "framed", `${shot}.png`),
    475,
    940,
    { transparent: true, scale: 2 }
  );

  // Poster, 1290x2796 (App Store 6.9" size) = 430x932 @3x.
  const [l1, l2] = CAPTIONS[shot] ?? ["OASIS", ""];
  render(
    `<html><head><style>${BASE_CSS}
      body { width: 430px; height: 932px; overflow: hidden; ${BACKDROP} display: flex; flex-direction: column; align-items: center; }
      .logo { height: 26px; margin-top: 34px; }
      h1 { font: 400 34px/1.12 Grenette, serif; color: #16151f; text-align: center; margin: 16px 20px 0; letter-spacing: -.6px; }
      .wrap { margin-top: 26px; transform: scale(.82); transform-origin: top center; filter: drop-shadow(0 30px 40px rgba(63,65,128,.28)); }
    </style></head><body>
      <img class="logo" src="${fileUrl(LOGO)}">
      <h1>${l1}<br>${l2}</h1>
      <div class="wrap">${phone(shot)}</div>
    </body></html>`,
    path.join(ROOT, "posters", `${shot}.png`),
    430,
    932,
    { scale: 3 }
  );
  console.log("mocked", shot);
}

if (!only || only === "showcase") {
  const featured = ["01-welcome-1", "08-home", "11-attendance", "14-fees", "09-students"].filter((s) => shots.includes(s));
  render(
    `<html><head><style>${BASE_CSS}
      body { width: 1600px; height: 900px; overflow: hidden; ${BACKDROP} }
      .title { position: absolute; top: 46px; left: 0; right: 0; text-align: center; font: 400 46px Grenette, serif; color: #16151f; letter-spacing: -.8px; }
      .sub { position: absolute; top: 112px; left: 0; right: 0; text-align: center; font: 400 20px Grenette, serif; color: #64748b; }
      .row { position: absolute; top: 170px; left: 0; right: 0; display: flex; justify-content: center; align-items: flex-start; gap: 6px; }
      .p { filter: drop-shadow(0 26px 34px rgba(63,65,128,.28)); }
    </style></head><body>
      <div class="title">OASIS for iPhone</div>
      <div class="sub">School management, simplified - in sync with the web.</div>
      <div class="row">${featured
        .map((s, i) => {
          const mid = Math.abs(i - (featured.length - 1) / 2);
          return `<div class="p" style="zoom: ${(0.74 - mid * 0.06).toFixed(2)}; margin: ${mid * 40}px 4px 0">${phone(s)}</div>`;
        })
        .join("")}</div>
    </body></html>`,
    process.env.SHOWCASE_OUT || path.join(ROOT, "showcase.png"),
    1600,
    900,
    { scale: Number(process.env.SHOWCASE_SCALE || 2) }
  );
  console.log("showcase done");
}
