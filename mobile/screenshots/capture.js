// Captures raw iPhone 16 screens (1179x2556) from the app's web build with
// headless Edge/Chrome. Usage:
//   npx expo export --platform web --output-dir <dir>   (serve it on BASE)
//   node screenshots/capture.js [baseUrl]
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.argv[2] || "http://127.0.0.1:8090";
const OUT = path.join(__dirname, "raw");
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const browser = BROWSERS.find((b) => fs.existsSync(b));
if (!browser) throw new Error("No Edge/Chrome found");

const D = "device=iphone16";
const DEMO = `demo=1&${D}`;
const SCREENS = [
  ["01-welcome-1", `/welcome?${D}`],
  ["02-welcome-2", `/welcome?slide=1&${D}`],
  ["03-welcome-3", `/welcome?slide=2&${D}`],
  ["04-sign-in", `/login?${D}`],
  ["05-sign-up", `/signup?${D}`],
  ["06-forgot-password", `/forgot-password?${D}`],
  ["07-pending-approval", `/pending?${DEMO}`],
  ["08-home", `/?${DEMO}`],
  ["09-students", `/students?${DEMO}`],
  ["10-add-student", `/students?add=1&${DEMO}`],
  ["11-attendance", `/attendance?${DEMO}`],
  ["12-messages", `/messages?${DEMO}`],
  ["13-more-modules", `/modules?${DEMO}`],
  ["14-fees", `/modules/fees?${DEMO}`],
  ["15-timetable", `/modules/timetable?${DEMO}`],
  ["16-school-setup", `/modules/setup?${DEMO}`],
  ["17-reporting", `/modules/reporting?${DEMO}`],
  ["18-calendar", `/modules/calendar?${DEMO}`],
  ["19-account", `/account?${DEMO}`],
  ["20-class-register", `/modules/register?${DEMO}`],
  ["21-bulk-add-students", `/modules/bulk-students?${DEMO}`],
  ["22-invoice-a-class", `/modules/bulk-invoice?${DEMO}`],
  ["23-staff-and-teaching", `/modules/staff?${DEMO}`],
  ["24-join-as-staff", `/signup?mode=staff&${D}`],
  ["25-register-school", `/register?${DEMO}`],
  ["26-register-profile", `/register?step=3&${DEMO}`],
  ["27-register-modules", `/register?step=8&${DEMO}`],
  ["28-register-documents-data", `/register?step=9&${DEMO}`],
  ["29-import-students-parents", `/modules/import-students?example=1&${DEMO}`],
  ["30-join-oasis-team", `/signup?mode=developer&${D}`],
  ["31-console-requests", `/platform?as=developer&${DEMO}`],
  ["32-console-application", `/platform/school/d0000000-0000-4000-8000-000000000001?as=developer&${DEMO}`],
  ["33-console-files", `/platform/school/d0000000-0000-4000-8000-000000000001?tab=files&as=developer&${DEMO}`],
  ["34-console-people-access", `/platform/school/d0000000-0000-4000-8000-000000000001?tab=people&as=developer&${DEMO}`],
  ["35-console-decision", `/platform/school/d0000000-0000-4000-8000-000000000001?tab=decision&as=developer&${DEMO}`],
  ["36-console-school-admins", `/platform/admins?as=developer&${DEMO}`],
  ["37-console-developers-keys", `/platform/developers?as=developer&${DEMO}`],
];

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[3];
for (const [name, route] of SCREENS) {
  if (only && !name.includes(only)) continue;
  if (process.env.SKIP_EXISTING && fs.existsSync(path.join(OUT, name + ".png"))) continue;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "oasis-shot-"));
  const file = path.join(OUT, `${name}.png`);
  execFileSync(
    browser,
    [
      "--headless=old",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      "--window-size=393,852",
      "--force-device-scale-factor=3",
      "--virtual-time-budget=9000",
      `--screenshot=${file}`,
      BASE + route,
    ],
    { stdio: "ignore", timeout: 60_000 }
  );
  // Edge's launcher can return before the PNG is flushed - wait for it.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !(fs.existsSync(file) && fs.statSync(file).size > 0)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {}
  console.log("captured", name);
}
