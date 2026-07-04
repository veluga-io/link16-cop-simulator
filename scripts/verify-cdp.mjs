import { writeFile } from "node:fs/promises";

const cdpHost = process.env.CDP_HOST ?? "http://127.0.0.1:9226";
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5174/";
const screenshotPath = process.env.SCREENSHOT_PATH ?? "/private/tmp/link16-cop-dashboard.png";

async function openTarget(url) {
  const res = await fetch(`${cdpHost}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!res.ok) throw new Error(`new target failed ${res.status}`);
  return res.json();
}

const target = await openTarget(appUrl);
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleErrors = [];

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
    consoleErrors.push(msg.params.args?.map((arg) => arg.value || arg.description).join(" "));
  }
  if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
    consoleErrors.push(msg.params.entry.text);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let seq = 0;
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${JSON.stringify(msg.error)}`)) : resolve(msg.result)));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }
    }, 12000);
  });
}

async function evalExpr(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

const commonHelpers = `
  const rectOf = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
  };
  const within = (outer, inner) => Boolean(
    outer &&
      inner &&
      inner.top >= outer.top - 2 &&
      inner.left >= outer.left - 2 &&
      inner.right <= outer.right + 2 &&
      inner.bottom <= outer.bottom + 2
  );
  const buttonByText = (label) => [...document.querySelectorAll('button')].find((node) => node.innerText.includes(label));
  const layerButtonByText = (label) => [...document.querySelectorAll('.settings-modal .layer-toggle')].find((node) => node.innerText.includes(label));
  const metricValue = (label) => Number(
    [...document.querySelectorAll('.metric-card')]
      .find((node) => node.innerText.toLowerCase().includes(label.toLowerCase()))
      ?.querySelector('strong')?.innerText || 0
  );
`;

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: appUrl });
await new Promise((resolve) => setTimeout(resolve, 2200));

const initial = await evalExpr(`(() => {
  ${commonHelpers}
  const text = document.body.innerText.toLowerCase();
  const presenterConsole = rectOf('.presenter-console');
  const mapWorkspace = rectOf('.map-workspace');
  const statusOverlay = rectOf('.map-overlay--status');
  const decisionOverlay = rectOf('.map-overlay--decision');
  const settingsControl = rectOf('.map-settings');
  const map = rectOf('.map-panel');
  const layerButtons = [...document.querySelectorAll('.layer-toggle')];
  return {
    title: text.includes('link-16 cop simulator'),
    presenterConsoleText: document.querySelector('.presenter-console')?.innerText || '',
    presenterOutsideMap: Boolean(presenterConsole && mapWorkspace && presenterConsole.bottom <= mapWorkspace.top + 2),
    commandHeaderInsideMap: Boolean(document.querySelector('.map-workspace .command-header')),
    scenarioInsidePresenter: Boolean(document.querySelector('.presenter-console .scenario-bar')),
    presenterMode: {
      full: Boolean(document.querySelector('.presenter-console--full')),
      compact: Boolean(document.querySelector('.presenter-console--compact')),
      modeToggle: Boolean(buttonByText('한줄 모드')),
      auxTogglesInPresenter: document.querySelectorAll('.presenter-console .layer-toggle').length,
      settingsButton: Boolean(document.querySelector('.map-settings__trigger')),
      settingsPanelInitiallyClosed: document.querySelectorAll('.settings-modal').length === 0,
      settingsInsideMap: within(mapWorkspace, settingsControl)
    },
    mapFirst: {
      hasWorkspace: Boolean(document.querySelector('.map-workspace')),
      baseMapFirstChild: document.querySelector('.map-workspace')?.firstElementChild?.classList.contains('map-panel--base') || false,
      statusInsideMap: within(mapWorkspace, statusOverlay),
      decisionInsideMap: within(mapWorkspace, decisionOverlay),
      statusText: document.querySelector('.map-overlay--status')?.innerText || '',
      mapLabel: document.querySelector('.map-panel__label')?.innerText || ''
    },
    defaultImportantUi: {
      crisisAlert: document.querySelector('.crisis-alert')?.innerText || '',
      metricsText: document.querySelector('.metrics-row')?.innerText || '',
      briefingText: document.querySelector('.briefing-panel')?.innerText || '',
      queueText: document.querySelector('.queue-panel')?.innerText || '',
      queueCards: document.querySelectorAll('.queue-card').length
    },
    optionalDefaults: {
      hiddenDocks: document.querySelectorAll('.optional-dock').length === 0,
      hiddenSettingsPanel: document.querySelectorAll('.settings-modal').length === 0,
      feedPanel: document.querySelectorAll('.feed-panel').length,
      trackPanel: document.querySelectorAll('.track-panel').length,
      assetPanel: document.querySelectorAll('.asset-grid .asset-card').length,
      osintCards: document.querySelectorAll('.source-card').length,
      aarSummary: document.querySelectorAll('.aar-summary').length,
      toggles: layerButtons.map((node) => ({
        label: node.innerText.trim(),
        pressed: node.getAttribute('aria-pressed')
      }))
    },
    markers: {
      tracks: document.querySelectorAll('.track-node').length,
      assets: document.querySelectorAll('.map-node--asset').length
    },
    speedControl: {
      exists: document.querySelectorAll('.speed-control button').length === 4,
      active: document.querySelector('.speed-control__button--active')?.innerText || '',
      labels: [...document.querySelectorAll('.speed-control button')].map((node) => node.innerText.trim())
    },
    catalogButton: Boolean(buttonByText('시뮬레이션 선택')),
    startButton: [...document.querySelectorAll('button')].some((node) => node.innerText.trim() === '시작'),
    liveTime: document.querySelector('.live-chip')?.innerText || '',
    activeSimulation: document.querySelector('.active-simulation')?.innerText || '',
    messageCount: metricValue('live messages'),
    removedUi: {
      hero: document.querySelectorAll('.hero').length,
      differentiation: document.querySelectorAll('.diff-panel').length,
      selectedPanel: document.querySelectorAll('.selected-panel').length,
      ccaTerms: /cca|wingman|sortie|mission allocation|planner/.test(text)
    },
    layout: {
      presenterConsole,
      settingsControl,
      mapWorkspace,
      statusOverlay,
      decisionOverlay,
      map,
      mapLabel: rectOf('.map-panel__label'),
      briefingPanel: rectOf('.briefing-panel'),
      queuePanel: rectOf('.queue-panel'),
      metricsRow: rectOf('.metrics-row'),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    },
    overlayZ: {
      status: Number(getComputedStyle(document.querySelector('.map-overlay--status') || document.body).zIndex || 0),
      decision: Number(getComputedStyle(document.querySelector('.map-overlay--decision') || document.body).zIndex || 0)
    }
  };
})()`);

const compactResult = await evalExpr(`(() => {
  ${commonHelpers}
  const compactButton = buttonByText('한줄 모드');
  compactButton?.click();
  return new Promise((resolve) => {
    setTimeout(() => {
      const compactText = document.querySelector('.presenter-console')?.innerText || '';
      const restoreButton = buttonByText('전체 콘솔');
      const compactState = {
        clickedCompact: Boolean(compactButton),
        compactClass: Boolean(document.querySelector('.presenter-console--compact')),
        fullClass: Boolean(document.querySelector('.presenter-console--full')),
        text: compactText,
        hasScenarioBar: Boolean(document.querySelector('.presenter-console .scenario-bar')),
        hasCatalogButton: Boolean(buttonByText('시뮬레이션 선택')),
        hasAuxToggle: document.querySelectorAll('.presenter-console .layer-toggle').length,
        controls: {
          start: [...document.querySelectorAll('.presenter-console button')].some((node) => node.innerText.trim() === '시작'),
          reset: [...document.querySelectorAll('.presenter-console button')].some((node) => node.innerText.trim() === '처음으로'),
          speedButtons: document.querySelectorAll('.presenter-console .speed-control button').length,
          restore: Boolean(restoreButton)
        }
      };
      restoreButton?.click();
      setTimeout(() => resolve({
        ...compactState,
        restoredFull: Boolean(document.querySelector('.presenter-console--full')),
        restoredScenarioBar: Boolean(document.querySelector('.presenter-console .scenario-bar')),
        restoredCatalogButton: Boolean(buttonByText('시뮬레이션 선택'))
      }), 120);
    }, 120);
  });
})()`);

const layerToggleResult = await evalExpr(`(() => {
  ${commonHelpers}
  const settingsButton = document.querySelector('.map-settings__trigger');
  settingsButton?.click();
  return new Promise((resolve) => {
    setTimeout(() => {
      const labels = ['수신 로그', '상관 로그', '자산', 'OSINT', 'AAR'];
      const clicked = labels.map((label) => {
        const button = layerButtonByText(label);
        button?.click();
        return Boolean(button);
      });
      const mapWorkspace = rectOf('.map-workspace');
      setTimeout(() => {
        const nextLogDock = rectOf('.optional-dock--logs');
        const nextSupportDock = rectOf('.optional-dock--support');
        const settingsOpened = Boolean(document.querySelector('.settings-modal'));
        const settingsText = document.querySelector('.settings-modal')?.innerText || '';
        const settingsModal = rectOf('.settings-modal');
        const settingsBackdrop = rectOf('.settings-modal-backdrop');
        const pressed = [...document.querySelectorAll('.layer-toggle')].map((node) => ({
            label: node.innerText.trim(),
            pressed: node.getAttribute('aria-pressed')
          }));
        const visible = {
            logDock: Boolean(nextLogDock),
            supportDock: Boolean(nextSupportDock),
            feedPanel: document.querySelectorAll('.feed-panel').length,
            trackPanel: document.querySelectorAll('.track-panel').length,
            assetCards: document.querySelectorAll('.asset-grid .asset-card').length,
            sourceCards: document.querySelectorAll('.source-card').length,
            aarSummary: document.querySelectorAll('.aar-summary').length
          };
        const insideMap = {
            logDock: within(mapWorkspace, nextLogDock),
            supportDock: within(mapWorkspace, nextSupportDock)
          };
        const layout = {
            logDock: nextLogDock,
            supportDock: nextSupportDock
          };
        document.querySelector('.settings-modal__close')?.click();
        setTimeout(() => {
          resolve({
            settingsOpened,
            settingsText,
            settingsModal,
            settingsBackdrop,
            settingsClosedAfterToggle: document.querySelectorAll('.settings-modal').length === 0,
            clicked,
            pressed,
            visible,
            insideMap,
            layout
          });
        }, 80);
      }, 120);
    }, 120);
  });
})()`);

const catalogResult = await evalExpr(`(() => {
  ${commonHelpers}
  const button = buttonByText('시뮬레이션 선택');
  button?.click();
  return new Promise((resolve) => {
    setTimeout(() => {
      const cards = [...document.querySelectorAll('.simulation-card')];
      resolve({
        opened: Boolean(button),
        count: cards.length,
        titles: cards.map((card) => card.querySelector('strong')?.innerText || ''),
        severities: cards.map((card) => card.querySelector('header span')?.innerText || ''),
        catalogInPresenter: Boolean(document.querySelector('.presenter-console .presenter-catalog')),
        catalogInsideMap: Boolean(document.querySelector('.map-workspace .simulation-catalog'))
      });
    }, 120);
  });
})()`);

const selectSimulationResult = await evalExpr(`(() => {
  const card = [...document.querySelectorAll('.simulation-card')].find((node) => node.innerText.includes('전쟁 발발 긴급 방공'));
  const selectButton = card ? [...card.querySelectorAll('button')].find((node) => node.innerText.trim() === '선택') : null;
  selectButton?.click();
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      clicked: Boolean(selectButton),
      catalogClosed: document.querySelectorAll('.simulation-card').length === 0,
      activeSimulation: document.querySelector('.active-simulation')?.innerText || '',
      mapTitle: document.querySelector('.map-panel h2')?.innerText || '',
      crisisAlert: document.querySelector('.crisis-alert')?.innerText || '',
      crisisAlertClass: document.querySelector('.crisis-alert')?.className || '',
      liveTime: document.querySelector('.live-chip')?.innerText || '',
      firstMessage: document.querySelector('.feed-item--latest strong')?.innerText || '',
      messageCount: Number([...document.querySelectorAll('.metric-card')].find((node) => node.innerText.toLowerCase().includes('live messages'))?.querySelector('strong')?.innerText || 0)
    }), 140);
  });
})()`);

await new Promise((resolve) => setTimeout(resolve, 2300));

const beforeStart = await evalExpr(`(() => ({
  liveTime: document.querySelector('.live-chip')?.innerText || '',
  messageCount: Number([...document.querySelectorAll('.metric-card')].find((node) => node.innerText.toLowerCase().includes('live messages'))?.querySelector('strong')?.innerText || 0)
}))()`);

const speedResult = await evalExpr(`(() => {
  const speedButton = [...document.querySelectorAll('.speed-control button')].find((node) => node.innerText.trim() === '4x');
  const startButton = [...document.querySelectorAll('button')].find((node) => node.innerText.trim() === '시작');
  speedButton?.click();
  startButton?.click();
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      speedClicked: Boolean(speedButton),
      startClicked: Boolean(startButton),
      active: document.querySelector('.speed-control__button--active')?.innerText || '',
      liveChip: document.querySelector('.live-chip')?.innerText || ''
    }), 100);
  });
})()`);

await new Promise((resolve) => setTimeout(resolve, 4600));

const afterLiveTick = await evalExpr(`(() => ({
  liveTime: document.querySelector('.live-chip')?.innerText || '',
  latestMessage: document.querySelector('.feed-item--latest strong')?.innerText || '',
  messageCount: Number([...document.querySelectorAll('.metric-card')].find((node) => node.innerText.toLowerCase().includes('live messages'))?.querySelector('strong')?.innerText || 0),
  recommendations: document.querySelectorAll('.queue-card').length,
  hostileMarkers: [...document.querySelectorAll('.track-node')].filter((node) => node.innerText.trim() === '!').length,
  activeSimulation: document.querySelector('.active-simulation')?.innerText || '',
  crisisAlert: document.querySelector('.crisis-alert')?.innerText || '',
  crisisAlertClass: document.querySelector('.crisis-alert')?.className || '',
  metricsText: document.querySelector('.metrics-row')?.innerText || '',
  briefingText: document.querySelector('.briefing-panel')?.innerText || '',
  fusedTrackText: document.querySelector('.track-panel')?.innerText || '',
  queueText: document.querySelector('.queue-panel')?.innerText || '',
  roePopupText: document.querySelector('.roe-approval-popup')?.innerText || '',
  roePopupButtons: document.querySelectorAll('.roe-approval-popup button').length,
  roePopupLayout: (() => {
    const popup = document.querySelector('.roe-approval-popup');
    if (!popup) return null;
    const rect = popup.getBoundingClientRect();
    const topElement = document.elementFromPoint(rect.left + 18, rect.top + 18);
    return {
      width: rect.width,
      height: rect.height,
      zIndex: Number(window.getComputedStyle(popup).zIndex || 0),
      topElementIsPopup: Boolean(topElement?.closest('.roe-approval-popup'))
    };
  })()
}))()`);

const approvalResult = await evalExpr(`(() => {
  const popup = document.querySelector('.roe-approval-popup');
  const popupButton = popup ? [...popup.querySelectorAll('button')].find((node) => node.innerText.trim() === '승인') : null;
  popupButton?.click();
  return {
    clicked: Boolean(popupButton),
    source: popup ? 'popup' : 'none',
    text: popup?.innerText || ''
  };
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const approvalAfter = await evalExpr(`(() => {
  const chips = [...document.querySelectorAll('.decision-chip')].map((node) => node.innerText.trim());
  return {
    chips,
    hasApproved: chips.includes('승인'),
    nextPopupText: document.querySelector('.roe-approval-popup')?.innerText || '',
    pendingMetric: [...document.querySelectorAll('.metric-card')]
      .find((node) => node.innerText.toLowerCase().includes('roe approvals'))
      ?.querySelector('strong')?.innerText || ''
  };
})()`);

const scenarioResult = await evalExpr(`(() => {
  const btn = [...document.querySelectorAll('button')].find((node) => node.innerText.includes('메시지 손실'));
  btn?.click();
  return Boolean(btn);
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const afterScenario = await evalExpr(`(() => ({
  degraded: document.querySelectorAll('.feed-item--degraded').length,
  active: [...document.querySelectorAll('.scenario-button--active')].map((node) => node.innerText.trim())
}))()`);

await new Promise((resolve) => setTimeout(resolve, 7600));

const endState = await evalExpr(`(() => ({
  liveTime: document.querySelector('.live-chip')?.innerText || '',
  messageCount: Number([...document.querySelectorAll('.metric-card')].find((node) => node.innerText.toLowerCase().includes('live messages'))?.querySelector('strong')?.innerText || 0),
  stopButtonVisible: [...document.querySelectorAll('button')].some((node) => node.innerText.trim() === '정지'),
  startButtonVisible: [...document.querySelectorAll('button')].some((node) => node.innerText.trim() === '시작')
}))()`);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await new Promise((resolve) => setTimeout(resolve, 500));

const mobile = await evalExpr(`(() => ({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  mapHeight: Math.round(document.querySelector('.cop-map')?.getBoundingClientRect().height || 0),
  presenterBeforeMap: (() => {
    const presenter = document.querySelector('.presenter-console')?.getBoundingClientRect();
    const map = document.querySelector('.map-workspace')?.getBoundingClientRect();
    return Boolean(presenter && map && presenter.bottom <= map.top + 2);
  })()
}))()`);

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await new Promise((resolve) => setTimeout(resolve, 500));

const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
ws.close();

const failures = [];
const requiredToggleLabels = ["수신 로그", "상관 로그", "자산", "OSINT", "AAR"];

if (!initial.title) failures.push("title missing");
if (
  !initial.presenterOutsideMap ||
  initial.commandHeaderInsideMap ||
  !initial.scenarioInsidePresenter ||
  !initial.presenterMode.full ||
  initial.presenterMode.compact
) {
  failures.push("presenter controls are not separated from the map");
}
if (
  initial.presenterMode.auxTogglesInPresenter > 0 ||
  !initial.presenterMode.settingsInsideMap ||
  !initial.presenterMode.settingsButton ||
  !initial.presenterMode.settingsPanelInitiallyClosed
) {
  failures.push("settings entry point is not separated from presenter controls");
}
if (
  !compactResult.clickedCompact ||
  !compactResult.compactClass ||
  compactResult.fullClass ||
  compactResult.hasScenarioBar ||
  compactResult.hasCatalogButton ||
  compactResult.hasAuxToggle ||
  !compactResult.controls.start ||
  !compactResult.controls.reset ||
  compactResult.controls.speedButtons !== 4 ||
  !compactResult.controls.restore ||
  compactResult.text.includes("상황 주입") ||
  compactResult.text.includes("보조 정보") ||
  !compactResult.restoredFull ||
  !compactResult.restoredScenarioBar ||
  !compactResult.restoredCatalogButton
) {
  failures.push("presenter compact/full mode toggle does not match requirements");
}
if (
  !initial.mapFirst.hasWorkspace ||
  !initial.mapFirst.baseMapFirstChild ||
  !initial.mapFirst.statusInsideMap ||
  !initial.mapFirst.decisionInsideMap
) {
  failures.push("map commander workspace or default overlays missing");
}
if (!initial.mapFirst.statusText.includes("지도 기반 지휘관 화면") || !initial.mapFirst.mapLabel.toLowerCase().includes("cop map")) {
  failures.push("map-first commander labels missing");
}
if (
  !initial.defaultImportantUi.crisisAlert.includes("WATCH ALERT") ||
  !initial.defaultImportantUi.metricsText.includes("COP CONFIDENCE") ||
  !initial.defaultImportantUi.briefingText ||
  !initial.defaultImportantUi.queueText.includes("AI ENGAGEMENT QUEUE")
) {
  failures.push("important commander UI is not visible by default");
}
if (
  !initial.optionalDefaults.hiddenDocks ||
  !initial.optionalDefaults.hiddenSettingsPanel ||
  initial.optionalDefaults.feedPanel ||
  initial.optionalDefaults.trackPanel ||
  initial.optionalDefaults.assetPanel ||
  initial.optionalDefaults.osintCards ||
  initial.optionalDefaults.aarSummary
) {
  failures.push("optional panels should be hidden by default");
}
if (initial.optionalDefaults.toggles.length > 0) failures.push("settings panel should not expose layer toggles by default");
if (initial.markers.tracks < 1) failures.push("initial track marker missing");
if (initial.markers.assets < 4) failures.push("map asset markers missing");
if (
  initial.removedUi.hero > 0 ||
  initial.removedUi.differentiation > 0 ||
  initial.removedUi.selectedPanel > 0 ||
  initial.removedUi.ccaTerms
) {
  failures.push("non-MVP UI residue found");
}
if (!initial.speedControl.exists || initial.speedControl.active !== "1x" || !initial.speedControl.labels.includes("4x")) {
  failures.push("speed control initial state missing");
}
if (!initial.catalogButton || !initial.startButton || !initial.liveTime.includes("READY")) {
  failures.push("manual scenario controls missing");
}
if (
  !initial.layout.map ||
  !initial.layout.mapWorkspace ||
  !initial.layout.briefingPanel ||
  !initial.layout.queuePanel ||
  initial.overlayZ.status < 800 ||
  initial.overlayZ.decision < 800
) {
  failures.push("critical map layout panels are missing or behind the map");
} else {
  const mapAlmostFillsWorkspace =
    initial.layout.map.width >= initial.layout.mapWorkspace.width - 4 &&
    initial.layout.map.height >= initial.layout.mapWorkspace.height - 4;
  if (!mapAlmostFillsWorkspace) failures.push("base map does not fill commander workspace");
}
if (initial.layout.metricsRow && initial.layout.metricsRow.height > 82) {
  failures.push("metrics row is too tall for always-on status role");
}
if (
  !layerToggleResult.settingsOpened ||
  !layerToggleResult.settingsText.includes("COP 설정") ||
  !layerToggleResult.settingsText.includes("보조 정보") ||
  !layerToggleResult.settingsText.includes("지도 표시") ||
  !layerToggleResult.settingsText.includes("알림") ||
  !layerToggleResult.settingsText.includes("브리핑") ||
  !layerToggleResult.settingsModal ||
  layerToggleResult.settingsModal.width < 640 ||
  !layerToggleResult.settingsBackdrop ||
  !layerToggleResult.settingsClosedAfterToggle
) {
  failures.push("settings modal did not open with scalable settings sections");
}
if (!layerToggleResult.clicked.every(Boolean)) failures.push("optional layer toggle buttons did not click");
if (!requiredToggleLabels.every((label) => layerToggleResult.pressed.some((toggle) => toggle.label.includes(label)))) {
  failures.push("settings panel missing auxiliary layer toggles");
}
if (
  !layerToggleResult.visible.logDock ||
  !layerToggleResult.visible.supportDock ||
  layerToggleResult.visible.feedPanel < 1 ||
  layerToggleResult.visible.trackPanel < 1 ||
  layerToggleResult.visible.assetCards < 1 ||
  layerToggleResult.visible.sourceCards < 1 ||
  layerToggleResult.visible.aarSummary < 1
) {
  failures.push("optional panels did not appear after toggling");
}
if (!layerToggleResult.insideMap.logDock || !layerToggleResult.insideMap.supportDock) {
  failures.push("optional panels are not docked inside the map when enabled");
}
if (!layerToggleResult.pressed.every((toggle) => toggle.pressed === "true")) {
  failures.push("optional layer toggle state did not update");
}
if (
  !catalogResult.opened ||
  catalogResult.count < 4 ||
  !catalogResult.titles.includes("기초 감시 훈련") ||
  !catalogResult.titles.includes("동해 해상 접근 감시") ||
  !catalogResult.titles.includes("서해 NLL 전자전 압박") ||
  !catalogResult.titles.includes("전쟁 발발 긴급 방공") ||
  !catalogResult.catalogInPresenter ||
  catalogResult.catalogInsideMap
) {
  failures.push("simulation catalog is missing presets or is still inside the map");
}
if (
  !selectSimulationResult.clicked ||
  !selectSimulationResult.catalogClosed ||
  !selectSimulationResult.activeSimulation.includes("전쟁 발발 긴급 방공") ||
  !selectSimulationResult.mapTitle.includes("긴급 방공") ||
  !selectSimulationResult.crisisAlert.includes("CRITICAL ALERT") ||
  !selectSimulationResult.crisisAlertClass.includes("crisis-alert--critical") ||
  !selectSimulationResult.liveTime.includes("READY") ||
  selectSimulationResult.firstMessage !== "WAR-001"
) {
  failures.push("war emergency simulation did not load correctly");
}
if (
  beforeStart.liveTime !== selectSimulationResult.liveTime ||
  beforeStart.messageCount !== selectSimulationResult.messageCount
) {
  failures.push("simulation advanced before manual start");
}
if (
  !speedResult.speedClicked ||
  !speedResult.startClicked ||
  speedResult.active !== "4x" ||
  !speedResult.liveChip.includes("LIVE") ||
  !speedResult.liveChip.includes("4x")
) {
  failures.push("manual start or 4x speed control failed");
}
if (!/동해|중복|confidence|메시지 손실|적성|방공|ROE/.test(initial.defaultImportantUi.briefingText)) {
  failures.push("auto briefing content missing");
}
if (!afterLiveTick.latestMessage.startsWith("WAR-") || !afterLiveTick.activeSimulation.includes("전쟁 발발 긴급 방공")) {
  failures.push("selected simulation did not run war message stream");
}
if (
  afterLiveTick.hostileMarkers < 6 ||
  afterLiveTick.recommendations < 5 ||
  !afterLiveTick.fusedTrackText.includes("HOST-703") ||
  !afterLiveTick.fusedTrackText.includes("HOST-704") ||
  !afterLiveTick.fusedTrackText.includes("HOST-705") ||
  !afterLiveTick.queueText.includes("HOST-703")
) {
  failures.push("war emergency simulation does not show enough hostile tracks");
}
if (
  !afterLiveTick.crisisAlert.includes("CRITICAL ALERT") ||
  !afterLiveTick.crisisAlert.includes("지휘관 ROE 승인") ||
  !afterLiveTick.crisisAlertClass.includes("crisis-alert--critical")
) {
  failures.push("critical warning banner missing during war simulation");
}
if (
  afterLiveTick.crisisAlert.includes("MSG LOSS") ||
  afterLiveTick.crisisAlert.includes("COP CONF") ||
  !afterLiveTick.metricsText.includes("MESSAGE LOSS") ||
  !afterLiveTick.metricsText.includes("ROE APPROVALS") ||
  !afterLiveTick.metricsText.includes("COP CONFIDENCE")
) {
  failures.push("crisis alert and metrics row still duplicate telemetry responsibilities");
}
if (
  !afterLiveTick.roePopupText.includes("ROE 승인 필요") ||
  !afterLiveTick.roePopupText.includes("HOST-") ||
  !afterLiveTick.roePopupText.includes("승인") ||
  afterLiveTick.roePopupButtons < 2
) {
  failures.push("ROE approval popup did not appear when approval was required");
}
if (
  !afterLiveTick.roePopupLayout ||
  afterLiveTick.roePopupLayout.zIndex < 4000 ||
  !afterLiveTick.roePopupLayout.topElementIsPopup
) {
  failures.push("ROE approval popup is not above map overlays");
}
if (
  afterLiveTick.roePopupLayout &&
  (afterLiveTick.roePopupLayout.width > 400 || afterLiveTick.roePopupLayout.height > 300)
) {
  failures.push("ROE approval popup is still too large");
}
if (afterLiveTick.liveTime === initial.liveTime && afterLiveTick.messageCount === initial.messageCount) {
  failures.push("live feed did not advance after manual start");
}
if (!endState.liveTime.includes("COMPLETE") || endState.stopButtonVisible || !endState.startButtonVisible) {
  failures.push("simulation did not stop at scenario end");
}
if (!scenarioResult || afterScenario.degraded < 1) failures.push("scenario toggle did not degrade feed");
if (!approvalResult.clicked || approvalResult.source !== "popup" || !approvalAfter.hasApproved) {
  failures.push("popup approval action did not update chip");
}
if (mobile.overflow || !mobile.presenterBeforeMap) failures.push("mobile layout overflow or presenter/map order broken");
if (consoleErrors.length > 0) failures.push("console errors found");

const result = {
  ok: failures.length === 0,
  failures,
  initial,
  compactResult,
  layerToggleResult,
  catalogResult,
  selectSimulationResult,
  beforeStart,
  speedResult,
  afterLiveTick,
  afterScenario,
  approvalAfter,
  endState,
  mobile,
  consoleErrors,
  screenshotPath,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
