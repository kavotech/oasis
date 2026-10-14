// Runs before React Native Web initialises (see index.js). With
// ?device=iphone16 on the web build, pin the layout viewport to the iPhone 16's
// 393x852pt so headless-browser screenshots lay out exactly like the phone
// (headless Chrome/Edge won't open a window narrower than ~500px). No-op on
// native and for normal web visits.
if (typeof window !== "undefined" && typeof document !== "undefined" && new URLSearchParams(window.location.search).get("device") === "iphone16") {
  const W = 393;
  const H = 852;
  try {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { width: W, height: H, scale: 1, offsetLeft: 0, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
    });
  } catch {}
  const style = document.createElement("style");
  style.textContent = `html, body, #root { width: ${W}px !important; height: ${H}px !important; max-width: ${W}px; overflow: hidden !important; }`;
  document.head.appendChild(style);
}
