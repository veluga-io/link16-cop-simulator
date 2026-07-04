const cdpHost = process.env.CDP_HOST ?? "http://127.0.0.1:9226";
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5176/";

async function openTarget(url) {
  const response = await fetch(`${cdpHost}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`new target failed: ${response.status}`);
  return response.json();
}

const target = await openTarget(appUrl);
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleErrors = [];

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
    return;
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
    consoleErrors.push(message.params.args?.map((arg) => arg.value || arg.description).join(" "));
  }
  if (message.method === "Log.entryAdded" && message.params?.entry?.level === "error") {
    consoleErrors.push(message.params.entry.text);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let sequence = 0;
function send(method, params = {}) {
  const id = ++sequence;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${JSON.stringify(message.error)}`)) : resolve(message.result)));
    setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 12000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: appUrl });
await new Promise((resolve) => setTimeout(resolve, 1600));

await evaluate(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === '4x')?.click();
  [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === '시작')?.click();
})()`);

await new Promise((resolve) => setTimeout(resolve, 5600));

const launchDroneStep = await evaluate(`(() => {
  const launchDrone = document.querySelector('.unit-marker--launch-ready');
  launchDrone?.click();
  return { clickedLaunchDrone: Boolean(launchDrone) };
})()`);

await new Promise((resolve) => setTimeout(resolve, 500));

const targetDroneStep = await evaluate(`(() => {
  const reconDrone =
    document.querySelector('.unit-marker--track.unit-marker--red.unit-marker--swarm') ||
    document.querySelector('.unit-marker--track.unit-marker--red.unit-marker--uav');
  reconDrone?.click();
  return {
    clickedReconDrone: Boolean(reconDrone)
  };
})()`);

await new Promise((resolve) => setTimeout(resolve, 600));

const manualDroneStep = await evaluate(`(() => ({
  ...${JSON.stringify(launchDroneStep)},
  ...${JSON.stringify(targetDroneStep)},
  manualStateText: document.querySelector('.manual-intercept')?.innerText || '',
  manualResolved: Boolean(document.querySelector('.manual-intercept--resolved'))
}))()`);

await new Promise((resolve) => setTimeout(resolve, 3800));

const beforeClick = await evaluate(`(() => ({
  liveChip: document.querySelector('.live-chip')?.innerText || '',
  redFighters: document.querySelectorAll('.unit-marker--fighter-raid-red').length,
  blueFighters: document.querySelectorAll('.unit-marker--fighter-raid-blue').length,
  readyBlue: document.querySelectorAll('.unit-marker--response-ready').length,
  selectedBlue: document.querySelectorAll('.unit-marker--response-selected').length,
  reconDrone: document.querySelectorAll('.unit-marker--red.unit-marker--swarm, .unit-marker--red.unit-marker--uav').length,
  attackDroneReady: document.querySelectorAll('.unit-marker--launch-ready').length
}))()`);

await evaluate(`(() => {
  document.querySelector('.unit-marker--fighter-raid-blue')?.click();
})()`);

await new Promise((resolve) => setTimeout(resolve, 500));

const afterClick = await evaluate(`(() => ({
  liveChip: document.querySelector('.live-chip')?.innerText || '',
  redFighters: document.querySelectorAll('.unit-marker--fighter-raid-red').length,
  blueFighters: document.querySelectorAll('.unit-marker--fighter-raid-blue').length,
  readyBlue: document.querySelectorAll('.unit-marker--response-ready').length,
  selectedBlue: document.querySelectorAll('.unit-marker--response-selected').length,
  assignmentLines: [...document.querySelectorAll('.leaflet-overlay-pane path')].filter((path) => {
    const stroke = path.getAttribute('stroke') || path.style.stroke || '';
    return stroke === '#38bdf8' || stroke.includes('56, 189, 248');
  }).length,
  lineStrokes: [...new Set([...document.querySelectorAll('.leaflet-overlay-pane path')].map((path) => path.getAttribute('stroke') || path.style.stroke || '').filter(Boolean))].slice(0, 8)
}))()`);

const failures = [];
if (beforeClick.redFighters !== 150) failures.push(`expected 150 red fighter icons, got ${beforeClick.redFighters}`);
if (beforeClick.blueFighters !== 50) failures.push(`expected 50 blue fighter icons, got ${beforeClick.blueFighters}`);
if (!manualDroneStep.clickedLaunchDrone || !manualDroneStep.clickedReconDrone) failures.push("manual drone intercept click path did not execute");
if (beforeClick.readyBlue < 1) failures.push("expected clickable blinking blue response fighters");
if (afterClick.selectedBlue !== 1) failures.push(`expected one selected blue response fighter, got ${afterClick.selectedBlue}`);
if (afterClick.readyBlue !== 0) failures.push(`expected ready pulse to stop after response selection, got ${afterClick.readyBlue}`);
if (afterClick.assignmentLines < 1) failures.push("expected at least one blue assignment line after response fighter selection");
if (consoleErrors.length > 0) failures.push(`console errors: ${consoleErrors.join(" | ")}`);

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      failures,
      manualDroneStep,
      beforeClick,
      afterClick,
      consoleErrors,
    },
    null,
    2,
  ),
);

ws.close();
if (failures.length > 0) process.exit(1);
