const blendModes = [
    { label: "正常", value: "normal" },
    { label: "正片叠底", value: "multiply" },
    { label: "明度", value: "luminosity" },
    { label: "颜色", value: "color" },
    { label: "饱和度", value: "saturation" },
    { label: "叠加", value: "overlay" },
    { label: "线性光", value: "hard-light" }
];

const maxLayers = 30;
const maxHistory = 50;
const historySize = 14;
const minCanvasW = 800;
const minCanvasH = 600;
const maxCanvasSize = 5000;
const minZoom = 10;
const maxZoom = 300;

const canvasStage = document.getElementById("canvasStage");
const layerStack = document.getElementById("layerStack");
const canvasZone = document.getElementById("canvasZone");
canvasStage.style.touchAction = "none";
canvasZone.style.touchAction = "none";
const cursorEl = document.getElementById("brushCursor");

const activeColorPicker = document.getElementById("activeColorPicker");
const colorPopover = document.getElementById("colorPopover");
const primarySlot = document.getElementById("primarySlot");
const secondarySlot = document.getElementById("secondarySlot");
const swapColorsBtn = document.getElementById("swapColorsBtn");
const colorHistoryGrid = document.getElementById("colorHistoryGrid");

const rgbModeBtn = document.getElementById("rgbModeBtn");
const wheelModeBtn = document.getElementById("wheelModeBtn");
const rgbPanel = document.getElementById("rgbPanel");
const wheelPanel = document.getElementById("wheelPanel");
const rgbSvCanvas = document.getElementById("rgbSvCanvas");
const rgbSvCtx = rgbSvCanvas.getContext("2d");
const rgbHueRange = document.getElementById("rgbHueRange");
const wheelCanvas = document.getElementById("wheelCanvas");
const wheelCtx = wheelCanvas.getContext("2d");

const rRange = document.getElementById("rRange");
const gRange = document.getElementById("gRange");
const bRange = document.getElementById("bRange");
const rInput = document.getElementById("rInput");
const gInput = document.getElementById("gInput");
const bInput = document.getElementById("bInput");
const hRange = document.getElementById("hRange");
const sRange = document.getElementById("sRange");
const vRange = document.getElementById("vRange");
const hInput = document.getElementById("hInput");
const sInput = document.getElementById("sInput");
const vInput = document.getElementById("vInput");

const brushPanelBtn = document.getElementById("brushPanelBtn");
const eraserPanelBtn = document.getElementById("eraserPanelBtn");
const panToolBtn = document.getElementById("panToolBtn");
const pickerPanels = document.getElementById("pickerPanels");
const brushPanel = document.getElementById("brushPanel");
const eraserPanel = document.getElementById("eraserPanel");
const brushGrid = document.getElementById("brushGrid");
const eraserGrid = document.getElementById("eraserGrid");

const sizeSlider = document.getElementById("sizeSlider");
const opacitySlider = document.getElementById("opacitySlider");
const opacityInput = document.getElementById("opacityInput");
const opacityValue = document.getElementById("opacityValue");
const sizeInput = document.getElementById("sizeInput");
const sizeValue = document.getElementById("sizeValue");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");

const canvasWidthInput = document.getElementById("canvasWidthInput");
const canvasHeightInput = document.getElementById("canvasHeightInput");
const resizeCanvasBtn = document.getElementById("resizeCanvasBtn");
const zoomSlider = document.getElementById("zoomSlider");
const zoomInput = document.getElementById("zoomInput");
const resetZoomBtn = document.getElementById("resetZoomBtn");

const layerDrawer = document.getElementById("layerDrawer");
const layerDrawerToggle = document.getElementById("layerDrawerToggle");
const layerList = document.getElementById("layerList");
const addLayerBtn = document.getElementById("addLayerBtn");
const topToast = document.getElementById("topToast");

const eventControl = document.getElementById("eventControl");
const eventControlToggle = document.getElementById("eventControlToggle");
const eventCurrentLabel = document.getElementById("eventCurrentLabel");
const eventCurrentCountdown = document.getElementById("eventCurrentCountdown");
const eventNextCountdown = document.getElementById("eventNextCountdown");
const eventDurationInput = document.getElementById("eventDurationInput");
const eventIntervalInput = document.getElementById("eventIntervalInput");
const eventNextSelect = document.getElementById("eventNextSelect");
const eventNextApplyBtn = document.getElementById("eventNextApplyBtn");
const eventForceNextBtn = document.getElementById("eventForceNextBtn");
const eventForceEndBtn = document.getElementById("eventForceEndBtn");
const eventActiveList = document.getElementById("eventActiveList");
const eventPoolGrid = document.getElementById("eventPoolGrid");

let canvasWidth = 800;
let canvasHeight = 600;
let zoomPercent = 100;

let layers = [];
let activeLayerId = null;
let layerIdSeq = 1;

let isDrawing = false;
let hasDrawnOnCurrentStroke = false;
let currentStrokeId = null;
let currentStrokeColor = null;
let lastX = 0;
let lastY = 0;
let lastInputX = 0;
let lastInputY = 0;
let lastPressure = 1;
let isRestoring = false;

let isPanMode = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;

let openToolPanel = null;
let activeWheelDrag = null;
let activeRgbSvDrag = false;
let isColorPopoverOpen = false;
let isLayerDrawerOpen = false;
let activeRoomEvent = null;
let activeRoomEvents = [];
let eventEndTimer = null;
let eventEndTimers = new Map();
let eventBanner = null;
let eventBannerTimer = null;
let eventControlState = null;
let eventServerOffsetMs = 0;
let currentUsername = null;
let eventCountdownTimer = null;
let isEventControlCollapsed = true;
let currentRoom = null;
let historyQuota = {
    undoTokens: 10,
    redoTokens: 10,
    maxTokens: 10,
    recoverSeconds: 1,
    lastUpdate: Date.now(),
};
let historyQuotaTimer = null;
let isApplyingSharedToolState = false;
let sharedToolbarTimers = new Map();
let toolGrabState = {
    drops: [],
    permissions: {},
};
let toolDropLayer = null;

// ===================== 速写挑战模块 =====================
let challengeWidget = null;
let challengeTimerInterval = null;
let isChallengeActive = false;
let currentChallengeTopic = "";
let currentChallengeImage = null;
let challengeEndsAt = 0;
let customChallenges = [];


// // 预设题目库（按分类，支持多选）
// const PRESET_CATEGORIES = {
//     "人物速写": [
//         { text: "默写任意站姿", image_data: "/static/images/1.jpg" },
//         { text: "任意45°仰视头部", image_data: "static/image/2.jpg" },
//         { text: "戴帽子的侧脸", image_data: "static/image/3.jpg" }
//     ],
//     "动物": [
//         { text: "画一个任意动物", image_data: "static/image/2.jpg" },
//         { text: "飞翔的鸟", image_data: "static/image/3.jpg" },
//         { text: "水中的鱼", image_data: "static/image/2.jpg" }
//     ],
//     "场景": [
//         { text: "夏日海滩", image_data: "static/image/4.jpg" },
//         { text: "未来城市", image_data: "static/image/2.jpg" },
//         { text: "森林小屋", image_data: "static/image/5.jpg" }
//     ]
// };

const socket = io();

const undoStack = [];
const redoStack = [];

const toolState = {
    mode: "brush",

    size: 8,
    opacity: 1,
    flow: 1,
    hardness: 0.9,

    pressureSize: true,
    pressureOpacity: false,

    smoothing: 0.45,

    spacing: 0.08,

    brushPreset: "pencil",
    eraserPreset: "soft-eraser",

    brushType: "round"
};

const colorState = {
    activeSlot: "primary",
    primaryHex: "#222222",
    secondaryHex: "#ffffff",
    history: [],
    r: 34,
    g: 34,
    b: 34,
    h: 0,
    s: 0,
    v: 13
};

const brushPresets = [

    {
        id: "pencil",
        name: "铅笔",
        size: 3,
        opacity: 0.9,
        hardness: 1,
        brushType: "round"
    },

    {
        id: "soft",
        name: "柔边笔",
        size: 30,
        opacity: 0.18,
        hardness: 0.2,
        brushType: "soft"
    },

    {
        id: "marker",
        name: "马克笔",
        size: 24,
        opacity: 0.45,
        hardness: 0.7,
        brushType: "round"
    },

    {
        id: "ink",
        name: "墨线",
        size: 8,
        opacity: 1,
        hardness: 1,
        brushType: "round"
    },

    {
        id: "airbrush",
        name: "喷枪",
        size: 60,
        opacity: 0.05,
        hardness: 0,
        brushType: "soft"
    }
];
const eraserPresets = [

    {
        id: "soft-eraser",
        name: "柔边橡皮",
        size: 40,
        opacity: 0.35,
        flow: 0.3,
        hardness: 0.15,
        spacing: 0.08,
        type: "soft"
    },

    {
        id: "hard-eraser",
        name: "硬边橡皮",
        size: 24,
        opacity: 1,
        flow: 1,
        hardness: 1,
        spacing: 0.05,
        type: "round"
    },

    {
        id: "big-eraser",
        name: "大面积橡皮",
        size: 90,
        opacity: 0.5,
        flow: 0.25,
        hardness: 0.2,
        spacing: 0.12,
        type: "soft"
    }
];
let toastTimer = null;

function showToast(message) {
    topToast.textContent = message;
    topToast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        topToast.classList.remove("show");
    }, 2200);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function rgbToHex(r, g, b) {
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);

    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((ch) => ch + ch).join("") : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const diff = max - min;
    let h = 0;
    if (diff !== 0) {
        if (max === rn) h = ((gn - bn) / diff) % 6;
        else if (max === gn) h = (bn - rn) / diff + 2;
        else h = (rn - gn) / diff + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : (diff / max) * 100;
    const v = max * 100;
    return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

function hsvToRgb(h, s, v) {
    const sn = clamp(s, 0, 100) / 100;
    const vn = clamp(v, 0, 100) / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;
    let rn = 0;
    let gn = 0;
    let bn = 0;

    if (h >= 0 && h < 60) { rn = c; gn = x; bn = 0; }
    else if (h < 120) { rn = x; gn = c; bn = 0; }
    else if (h < 180) { rn = 0; gn = c; bn = x; }
    else if (h < 240) { rn = 0; gn = x; bn = c; }
    else if (h < 300) { rn = x; gn = 0; bn = c; }
    else { rn = c; gn = 0; bn = x; }

    return {
        r: Math.round((rn + m) * 255),
        g: Math.round((gn + m) * 255),
        b: Math.round((bn + m) * 255)
    };
}

function getSlotHex(slot) {
    return slot === "secondary" ? colorState.secondaryHex : colorState.primaryHex;
}

function setSlotHex(slot, hex) {
    if (slot === "secondary") colorState.secondaryHex = hex.toLowerCase();
    else colorState.primaryHex = hex.toLowerCase();
}

function currentBrushColor() {
    return getSlotHex(colorState.activeSlot);
}

function isRoomEventActive(type) {
    return activeRoomEvents.some((eventData) => eventData?.type === type);
}

function isMirrorAxisActive(axis) {
    return activeRoomEvents.some(
        (eventData) => eventData?.type === "mirror" && eventData.axis === axis
    );
}

function getActiveRoomEvents() {
    return activeRoomEvents.slice();
}

function randomHexColor() {
    return rgbToHex(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
    );
}

function getDrawColor() {
    return currentStrokeColor || currentBrushColor();
}

function getEventBrushSize(size = toolState.size) {
    return size;
}

function getEventLabel(eventData) {
    const labels = {
        grayscale: "随机事件：黑白世界",
        mirror: eventData?.axis === "vertical"
            ? "随机事件：上下镜像"
            : "随机事件：左右镜像",
        reverse_mouse: "随机事件：鼠标反转",
        random_color: "随机事件：落笔随机颜色",
        shared_history: "随机事件：共享撤回/重做"
        ,
        shared_toolbar: "随机事件：共享工具栏",
        tool_grab: "随机事件：工具抢夺"
    };

    return labels[eventData?.type] || "随机事件发生中";
}

function getActiveLayer() {
    return layers.find((layer) => layer.id === activeLayerId) || null;
}

function refreshDualColorUI() {
    primarySlot.style.background = colorState.primaryHex;
    secondarySlot.style.background = colorState.secondaryHex;
    primarySlot.classList.toggle("active", colorState.activeSlot === "primary");
    secondarySlot.classList.toggle("active", colorState.activeSlot === "secondary");
    activeColorPicker.style.background = currentBrushColor();
}

function syncRgbControls() {
    rRange.value = String(colorState.r);
    gRange.value = String(colorState.g);
    bRange.value = String(colorState.b);
    rInput.value = String(colorState.r);
    gInput.value = String(colorState.g);
    bInput.value = String(colorState.b);
}

function syncHsvControls() {
    hRange.value = String(colorState.h);
    sRange.value = String(colorState.s);
    vRange.value = String(colorState.v);
    hInput.value = String(colorState.h);
    sInput.value = String(colorState.s);
    vInput.value = String(colorState.v);
    rgbHueRange.value = String(colorState.h);
}

function drawRgbSvPanel() {
    const w = rgbSvCanvas.width;
    const h = rgbSvCanvas.height;
    rgbSvCtx.clearRect(0, 0, w, h);
    rgbSvCtx.fillStyle = `hsl(${colorState.h}, 100%, 50%)`;
    rgbSvCtx.fillRect(0, 0, w, h);
    const satGradient = rgbSvCtx.createLinearGradient(0, 0, w, 0);
    satGradient.addColorStop(0, "rgba(255,255,255,1)");
    satGradient.addColorStop(1, "rgba(255,255,255,0)");
    rgbSvCtx.fillStyle = satGradient;
    rgbSvCtx.fillRect(0, 0, w, h);
    const valGradient = rgbSvCtx.createLinearGradient(0, 0, 0, h);
    valGradient.addColorStop(0, "rgba(0,0,0,0)");
    valGradient.addColorStop(1, "rgba(0,0,0,1)");
    rgbSvCtx.fillStyle = valGradient;
    rgbSvCtx.fillRect(0, 0, w, h);

    const svX = (colorState.s / 100) * w;
    const svY = ((100 - colorState.v) / 100) * h;
    rgbSvCtx.beginPath();
    rgbSvCtx.arc(svX, svY, 6, 0, Math.PI * 2);
    rgbSvCtx.strokeStyle = "#fff";
    rgbSvCtx.lineWidth = 2;
    rgbSvCtx.stroke();
    rgbSvCtx.beginPath();
    rgbSvCtx.arc(svX, svY, 7, 0, Math.PI * 2);
    rgbSvCtx.strokeStyle = "#111";
    rgbSvCtx.lineWidth = 1;
    rgbSvCtx.stroke();
}

function drawColorWheel() {
    const w = wheelCanvas.width;
    const h = wheelCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerRadius = 110;
    const innerRadius = 86;
    const squareHalf = 62;
    wheelCtx.clearRect(0, 0, w, h);

    for (let angle = 0; angle < 360; angle += 1) {
        const start = ((angle - 1) * Math.PI) / 180;
        const end = (angle * Math.PI) / 180;
        wheelCtx.beginPath();
        wheelCtx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
        wheelCtx.lineWidth = outerRadius - innerRadius;
        wheelCtx.arc(cx, cy, (outerRadius + innerRadius) / 2, start, end);
        wheelCtx.stroke();
    }

    const squareX = cx - squareHalf;
    const squareY = cy - squareHalf;
    const squareSize = squareHalf * 2;
    wheelCtx.fillStyle = `hsl(${colorState.h}, 100%, 50%)`;
    wheelCtx.fillRect(squareX, squareY, squareSize, squareSize);
    const satGradient = wheelCtx.createLinearGradient(squareX, 0, squareX + squareSize, 0);
    satGradient.addColorStop(0, "rgba(255,255,255,1)");
    satGradient.addColorStop(1, "rgba(255,255,255,0)");
    wheelCtx.fillStyle = satGradient;
    wheelCtx.fillRect(squareX, squareY, squareSize, squareSize);
    const valGradient = wheelCtx.createLinearGradient(0, squareY, 0, squareY + squareSize);
    valGradient.addColorStop(0, "rgba(0,0,0,0)");
    valGradient.addColorStop(1, "rgba(0,0,0,1)");
    wheelCtx.fillStyle = valGradient;
    wheelCtx.fillRect(squareX, squareY, squareSize, squareSize);

    const angleRad = (colorState.h * Math.PI) / 180;
    const ringRadius = (outerRadius + innerRadius) / 2;
    const ringX = cx + ringRadius * Math.cos(angleRad);
    const ringY = cy + ringRadius * Math.sin(angleRad);
    wheelCtx.beginPath();
    wheelCtx.arc(ringX, ringY, 6, 0, Math.PI * 2);
    wheelCtx.fillStyle = "#fff";
    wheelCtx.fill();
    wheelCtx.strokeStyle = "#222";
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();

    const svX = squareX + (colorState.s / 100) * squareSize;
    const svY = squareY + ((100 - colorState.v) / 100) * squareSize;
    wheelCtx.beginPath();
    wheelCtx.arc(svX, svY, 6, 0, Math.PI * 2);
    wheelCtx.strokeStyle = "#fff";
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();
    wheelCtx.beginPath();
    wheelCtx.arc(svX, svY, 7, 0, Math.PI * 2);
    wheelCtx.strokeStyle = "#111";
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();
}

function loadActiveSlotToControls() {
    const rgb = hexToRgb(currentBrushColor());
    colorState.r = rgb.r;
    colorState.g = rgb.g;
    colorState.b = rgb.b;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    colorState.h = hsv.h;
    colorState.s = hsv.s;
    colorState.v = hsv.v;
    syncRgbControls();
    syncHsvControls();
    refreshDualColorUI();
    drawRgbSvPanel();
    drawColorWheel();
}

function setActiveSlot(slot) {
    colorState.activeSlot = slot;
    loadActiveSlotToControls();
    scheduleSharedToolbarChange("color");
}

function swapSlots() {
    const temp = colorState.primaryHex;
    colorState.primaryHex = colorState.secondaryHex;
    colorState.secondaryHex = temp;
    loadActiveSlotToControls();
    scheduleSharedToolbarChange("color");
}

function renderColorHistory() {
    colorHistoryGrid.innerHTML = "";
    for (let i = 0; i < historySize; i += 1) {
        const color = colorState.history[i];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "history-item";
        if (color) {
            cell.style.background = color;
            cell.title = color;
            cell.addEventListener("click", () => {
                setSlotHex(colorState.activeSlot, color);
                loadActiveSlotToControls();
                scheduleSharedToolbarChange("color");
            });
        } else {
            cell.classList.add("empty");
            cell.disabled = true;
        }
        colorHistoryGrid.appendChild(cell);
    }
}

function pushHistoryColor(hex) {
    const normalized = hex.toLowerCase();
    const existing = colorState.history.indexOf(normalized);
    if (existing !== -1) colorState.history.splice(existing, 1);
    colorState.history.unshift(normalized);
    if (colorState.history.length > historySize) colorState.history.length = historySize;
    renderColorHistory();
}

function applyRgb(r, g, b) {
    colorState.r = clamp(Math.round(r), 0, 255);
    colorState.g = clamp(Math.round(g), 0, 255);
    colorState.b = clamp(Math.round(b), 0, 255);
    const hsv = rgbToHsv(colorState.r, colorState.g, colorState.b);
    colorState.h = hsv.h;
    colorState.s = hsv.s;
    colorState.v = hsv.v;
    setSlotHex(colorState.activeSlot, rgbToHex(colorState.r, colorState.g, colorState.b));
    syncRgbControls();
    syncHsvControls();
    refreshDualColorUI();
    drawRgbSvPanel();
    drawColorWheel();
    scheduleSharedToolbarChange("color");
}

function applyHsv(h, s, v) {
    colorState.h = clamp(Math.round(h), 0, 360);
    colorState.s = clamp(Math.round(s), 0, 100);
    colorState.v = clamp(Math.round(v), 0, 100);
    const rgb = hsvToRgb(colorState.h, colorState.s, colorState.v);
    colorState.r = rgb.r;
    colorState.g = rgb.g;
    colorState.b = rgb.b;
    setSlotHex(colorState.activeSlot, rgbToHex(colorState.r, colorState.g, colorState.b));
    syncRgbControls();
    syncHsvControls();
    refreshDualColorUI();
    drawRgbSvPanel();
    drawColorWheel();
    scheduleSharedToolbarChange("color");
}

function showColorMode(mode) {
    const isRgb = mode === "rgb";
    rgbModeBtn.classList.toggle("active", isRgb);
    wheelModeBtn.classList.toggle("active", !isRgb);
    rgbPanel.classList.toggle("active", isRgb);
    wheelPanel.classList.toggle("active", !isRgb);
}

function openColorPopover() {
    isColorPopoverOpen = true;
    colorPopover.classList.add("open");
    activeColorPicker.classList.add("active");
}

function closeColorPopover() {
    isColorPopoverOpen = false;
    colorPopover.classList.remove("open");
    activeColorPicker.classList.remove("active");
}

function toggleColorPopover() {
    if (isColorPopoverOpen) closeColorPopover();
    else openColorPopover();
}

function openLayerDrawer() {
    isLayerDrawerOpen = true;
    layerDrawer.classList.add("open");
}

function closeLayerDrawer() {
    isLayerDrawerOpen = false;
    layerDrawer.classList.remove("open");
}

function toggleLayerDrawer() {
    if (isLayerDrawerOpen) closeLayerDrawer();
    else openLayerDrawer();
}

function updateSizeControls() {
    sizeSlider.value = String(toolState.size);
    sizeInput.value = String(toolState.size);
    sizeValue.textContent = "px";
    updateCursorStyle();
}
function updateOpacityControls() {

    const percent =
        Math.round(toolState.opacity * 100);

    opacitySlider.value = percent;
    opacityInput.value = percent;
    opacityValue.textContent = `${percent}%`;
}

function getPresetName(mode, presetId) {
    const list = mode === "eraser" ? eraserPresets : brushPresets;
    return list.find((preset) => preset.id === presetId)?.name || presetId || mode;
}

function getToolPermissionKey(mode, presetId) {
    if (mode === "eraser") return `eraser:${presetId || toolState.eraserPreset}`;
    return `brush:${presetId || toolState.brushPreset}`;
}

function getMyToolGrabPermissions() {
    return toolGrabState.permissions?.[socket?.id] || {};
}

function hasToolGrabPermission(key) {
    if (!isRoomEventActive("tool_grab")) return true;
    if (key === "brush:pencil") return true;
    return Boolean(getMyToolGrabPermissions()[key]);
}

function canUseCurrentDrawingTool() {
    return hasToolGrabPermission(
        toolState.mode === "eraser"
            ? `eraser:${toolState.eraserPreset}`
            : `brush:${toolState.brushPreset}`
    );
}

function ensureAllowedToolDuringGrab() {
    if (!isRoomEventActive("tool_grab") || canUseCurrentDrawingTool()) return;
    toolState.mode = "brush";
    toolState.brushPreset = "pencil";
    const pencil = brushPresets.find((preset) => preset.id === "pencil");
    if (pencil) {
        toolState.size = pencil.size;
        toolState.opacity = pencil.opacity ?? 1;
        toolState.hardness = pencil.hardness ?? 1;
        toolState.brushType = pencil.brushType || "round";
    }
    closePanels();
    updateActiveCards();
    updateSizeControls();
    updateOpacityControls();
    updateCursorStyle();
}

function updateToolGrabRestrictedUI() {
    const active = isRoomEventActive("tool_grab");
    document.querySelectorAll(".tool-card").forEach((card) => {
        const key = getToolPermissionKey(card.dataset.mode, card.dataset.id);
        const locked = active && !hasToolGrabPermission(key);
        card.disabled = locked;
        card.classList.toggle("locked", locked);
    });

    addLayerBtn.disabled = active && !hasToolGrabPermission("layer:create");
    undoBtn.disabled = active && !hasToolGrabPermission("history:undo");
    redoBtn.disabled = active && !hasToolGrabPermission("history:redo");
    document.querySelectorAll(".layer-mix-button").forEach((button) => {
        button.disabled = active && !hasToolGrabPermission("layer:blend");
    });
}

function ensureToolDropLayer() {
    if (toolDropLayer) return toolDropLayer;
    toolDropLayer = document.createElement("div");
    toolDropLayer.className = "tool-drop-layer";
    document.body.appendChild(toolDropLayer);
    return toolDropLayer;
}

function clearToolDropLayer() {
    if (toolDropLayer) {
        toolDropLayer.innerHTML = "";
    }
}

function renderToolDrops() {
    const layer = ensureToolDropLayer();
    layer.innerHTML = "";

    if (!isRoomEventActive("tool_grab")) {
        return;
    }

    const now = getEventNowMs();
    for (const drop of toolGrabState.drops || []) {
        if (Number(drop.expiresAt || 0) * 1000 <= now) continue;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-drop-button";
        button.classList.toggle("bomb", drop.category === "bomb");
        button.textContent = drop.label || drop.tool || "工具";
        button.style.left = `${Number(drop.x ?? 50)}vw`;
        button.style.setProperty("--drop-drift", `${Number(drop.drift ?? 0)}px`);
        const fallDuration = Number(drop.fallDuration ?? 50);
        const elapsed = Math.max(0, (now / 1000) - Number(drop.createdAt || 0));
        button.style.animationDuration = `${fallDuration}s`;
        button.style.animationDelay = `-${Math.min(elapsed, fallDuration)}s`;
        button.title = "点击抢夺工具权限";
        button.addEventListener("click", () => {
            if (!currentRoom) return;
            button.disabled = true;
            socket.emit("claim_tool_drop", {
                room: currentRoom,
                dropId: drop.id,
            });
        });
        layer.appendChild(button);
    }
}

function syncToolGrabState(nextState) {
    toolGrabState = {
        drops: Array.isArray(nextState?.drops) ? nextState.drops : [],
        permissions: nextState?.permissions || {},
        next_drop_at: nextState?.next_drop_at || 0,
    };
    ensureAllowedToolDuringGrab();
    updateToolGrabRestrictedUI();
    renderToolDrops();
}

function getSharedToolLabel(reason) {
    if (reason === "color") return `颜色 ${currentBrushColor()}`;
    if (reason === "size") return `大小 ${toolState.size}px`;
    if (reason === "opacity") return `透明度 ${Math.round(toolState.opacity * 100)}%`;
    if (toolState.mode === "eraser") {
        return `橡皮-${getPresetName("eraser", toolState.eraserPreset)}`;
    }
    return `笔刷-${getPresetName("brush", toolState.brushPreset)}`;
}

function serializeSharedToolState() {
    return {
        tool: {
            mode: toolState.mode,
            size: toolState.size,
            opacity: toolState.opacity,
            flow: toolState.flow,
            hardness: toolState.hardness,
            pressureSize: toolState.pressureSize,
            pressureOpacity: toolState.pressureOpacity,
            smoothing: toolState.smoothing,
            spacing: toolState.spacing,
            brushPreset: toolState.brushPreset,
            eraserPreset: toolState.eraserPreset,
            brushType: toolState.brushType,
        },
        color: {
            activeSlot: colorState.activeSlot,
            primaryHex: colorState.primaryHex,
            secondaryHex: colorState.secondaryHex,
            r: colorState.r,
            g: colorState.g,
            b: colorState.b,
            h: colorState.h,
            s: colorState.s,
            v: colorState.v,
        },
    };
}

function emitSharedToolbarChange(reason = "tool") {
    if (!currentRoom || !isRoomEventActive("shared_toolbar") || isApplyingSharedToolState) {
        return;
    }

    socket.emit("shared_tool_state", {
        room: currentRoom,
        state: serializeSharedToolState(),
        label: getSharedToolLabel(reason),
    });
}

function scheduleSharedToolbarChange(reason = "tool", delay = 120) {
    if (!currentRoom || !isRoomEventActive("shared_toolbar") || isApplyingSharedToolState) {
        return;
    }

    clearTimeout(sharedToolbarTimers.get(reason));
    const timer = setTimeout(() => {
        sharedToolbarTimers.delete(reason);
        emitSharedToolbarChange(reason);
    }, delay);
    sharedToolbarTimers.set(reason, timer);
}

function applySharedToolState(sharedState) {
    if (!sharedState || !isRoomEventActive("shared_toolbar")) return;

    isApplyingSharedToolState = true;
    try {
        if (sharedState.tool) {
            Object.assign(toolState, sharedState.tool);
            if (toolState.mode === "brush" || toolState.mode === "eraser") {
                setPanMode(false);
            }
            updateActiveCards();
            updateSizeControls();
            updateOpacityControls();
            updateCursorStyle();
        }

        if (sharedState.color) {
            Object.assign(colorState, sharedState.color);
            syncRgbControls();
            syncHsvControls();
            refreshDualColorUI();
            drawRgbSvPanel();
            drawColorWheel();
        }
    } finally {
        isApplyingSharedToolState = false;
    }
}

function setToolSize(rawValue) {
    toolState.size =
        clamp(Number(rawValue) || 1, 1, 500);
    updateSizeControls();
    updateActiveCards();
    updateSizeControls();
}

function openPanel(panelName) {
    openToolPanel = panelName;
    pickerPanels.classList.add("open");
    brushPanel.classList.toggle("active", panelName === "brush");
    eraserPanel.classList.toggle("active", panelName === "eraser");
    brushPanelBtn.classList.toggle("is-panel-active", panelName === "brush");
    eraserPanelBtn.classList.toggle("is-panel-active", panelName === "eraser");
}

function closePanels() {
    openToolPanel = null;
    pickerPanels.classList.remove("open");
    brushPanel.classList.remove("active");
    eraserPanel.classList.remove("active");
    brushPanelBtn.classList.remove("is-panel-active");
    eraserPanelBtn.classList.remove("is-panel-active");
}

function togglePanel(panelName) {
    if (openToolPanel === panelName) closePanels();
    else openPanel(panelName);
}

function emitLayerUpdate(layer, changes) {
    if (!currentRoom || !layer) return;
    socket.emit("operation", {
        room: currentRoom,
        operation: {
            type: "layer_update",
            layerId: layer.id,
            changes
        }
    });
}

function emitLayerReorder() {
    if (!currentRoom) return;
    socket.emit("operation", {
        room: currentRoom,
        operation: {
            type: "layer_reorder",
            order: layers.map((layer) => layer.id),
            activeLayerId
        }
    });
}

function setPanMode(enabled) {
    isPanMode = enabled;
    panToolBtn.classList.toggle("pan-active", enabled);
    canvasZone.classList.toggle("pan-mode", enabled);
    if (!enabled) {
        isPanning = false;
        canvasZone.classList.remove("panning");
    }
    hideCursor();
}

function startPanning(event) {
    if (!isPanMode) return;
    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panStartScrollLeft = canvasZone.scrollLeft;
    panStartScrollTop = canvasZone.scrollTop;
    canvasZone.classList.add("panning");
    event.preventDefault();
}

function movePanning(event) {
    if (!isPanning) return;
    const dx = event.clientX - panStartX;
    const dy = event.clientY - panStartY;
    canvasZone.scrollLeft = panStartScrollLeft - dx;
    canvasZone.scrollTop = panStartScrollTop - dy;
}

function stopPanning() {
    if (!isPanning) return;
    isPanning = false;
    canvasZone.classList.remove("panning");
}

function setZoom(value) {
    zoomPercent = clamp(Math.round(value), minZoom, maxZoom);
    zoomSlider.value = String(zoomPercent);
    zoomInput.value = String(zoomPercent);
    const displayWidth = (canvasWidth * zoomPercent) / 100;
    const displayHeight = (canvasHeight * zoomPercent) / 100;
    canvasStage.style.width = `${displayWidth}px`;
    canvasStage.style.height = `${displayHeight}px`;
    for (const layer of layers) {
        layer.canvas.style.width = `${displayWidth}px`;
        layer.canvas.style.height = `${displayHeight}px`;
    }
    updateCursorStyle();
}

function zoomAtPoint(nextZoom, clientX, clientY) {
    const rect = canvasZone.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const oldScale = zoomPercent / 100;
    const worldX = (canvasZone.scrollLeft + pointerX) / oldScale;
    const worldY = (canvasZone.scrollTop + pointerY) / oldScale;
    setZoom(nextZoom);
    const newScale = zoomPercent / 100;
    canvasZone.scrollLeft = worldX * newScale - pointerX;
    canvasZone.scrollTop = worldY * newScale - pointerY;
}

function createLayer(name, id = null) {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.className = "paint-layer";
    canvas.style.width = `${(canvasWidth * zoomPercent) / 100}px`;
    canvas.style.height = `${(canvasHeight * zoomPercent) / 100}px`;
    canvas.style.display = "block";
    canvas.style.mixBlendMode = "normal";
    const ctx = canvas.getContext("2d");
    const layer = {
        id: id === null ? layerIdSeq++ : id,
        name,
        visible: true,
        locked: false,
        blend: "normal",
        opacity: 1,
        canvas,
        ctx
    };
    if (id !== null && id >= layerIdSeq) layerIdSeq = id + 1;
    return layer;
}


function generateLayerThumbnail(layer) {

    const thumbCanvas = document.createElement("canvas");

    thumbCanvas.width = 52;
    thumbCanvas.height = 52;

    const tctx = thumbCanvas.getContext("2d");

    const imageData = layer.ctx.getImageData(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    const data = imageData.data;

    let minX = canvasWidth;
    let minY = canvasHeight;
    let maxX = 0;
    let maxY = 0;

    let found = false;

    for (let y = 0; y < canvasHeight; y++) {

        for (let x = 0; x < canvasWidth; x++) {

            const alphaIndex =
                (y * canvasWidth + x) * 4 + 3;

            if (data[alphaIndex] > 0) {

                found = true;

                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    tctx.clearRect(0, 0, 52, 52);

    // 空图层
    if (!found) {

        tctx.fillStyle = "#f3f3f3";
        tctx.fillRect(0, 0, 52, 52);

        return thumbCanvas.toDataURL();
    }

    const drawWidth = maxX - minX + 1;
    const drawHeight = maxY - minY + 1;

    const size = Math.max(drawWidth, drawHeight);

    const tempCanvas = document.createElement("canvas");

    tempCanvas.width = size;
    tempCanvas.height = size;

    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.drawImage(
        layer.canvas,

        minX,
        minY,
        drawWidth,
        drawHeight,

        (size - drawWidth) / 2,
        (size - drawHeight) / 2,
        drawWidth,
        drawHeight
    );

    tctx.drawImage(
        tempCanvas,
        0,
        0,
        52,
        52
    );

    return thumbCanvas.toDataURL();
}



function syncLayerDomOrder() {
    layerStack.innerHTML = "";
    for (const layer of layers) {
        layer.canvas.style.display = layer.visible ? "block" : "none";
        layer.canvas.style.mixBlendMode = layer.blend;
        layer.canvas.style.opacity = layer.opacity;
        layerStack.appendChild(layer.canvas);
    }
}




function updateLayerList() {
    layerList.innerHTML = "";

    for (let i = layers.length - 1; i >= 0; i -= 1) {
        const layer = layers[i];

        const item = document.createElement("div");
        const dragHandle = document.createElement("div");

        dragHandle.className = "layer-drag-handle";

        dragHandle.textContent = "⋮⋮";

        dragHandle.draggable = true;
                

        item.className = "layer-item";
        item.dataset.layerId = layer.id;

        if (layer.id === activeLayerId) {
            item.classList.add("active");
        }

        item.addEventListener("click", (event) => {

            if (
                event.target.closest(".layer-name-input")
            ) {
                return;
            }

            if (
                event.target.closest(".layer-mix")
            ) {
                return;
            }

            if (
                event.target.closest(".layer-opacity")
            ) {
                return;
            }

            if (
                event.target.closest(".layer-mini-btn")
            ) {
                return;
            }

            if (
                event.target.closest(".layer-drag-handle")
            ) {
                return;
            }

            activeLayerId = layer.id;

            updateLayerList();
        });
        // 缩略图
        const thumb = document.createElement("img");
        thumb.className = "layer-thumb";
        thumb.src = generateLayerThumbnail(layer);

        // 图层名称
        const nameWrap = document.createElement("div");
        nameWrap.className = "layer-name-wrap";

        const nameLabel = document.createElement("div");
        nameLabel.className = "layer-name-label";
        nameLabel.textContent = layer.name;

        nameLabel.addEventListener("dblclick", (event) => {

            event.stopPropagation();

            const input = document.createElement("input");

            input.type = "text";

            input.value = layer.name;

            input.className = "layer-name-input";

            nameWrap.innerHTML = "";

            nameWrap.appendChild(input);

            input.focus();

            input.select();

            function finishRename() {

                const next = input.value.trim();

                if (next) {
                    layer.name = next;
                }

                updateLayerList();

                pushHistory();
                emitLayerUpdate(layer, { name: layer.name });
            }

            input.addEventListener("blur", finishRename);

            input.addEventListener("keydown", (e) => {

                e.stopPropagation();

                if (e.key === "Enter") {
                    finishRename();
                }
            });
        });
        nameWrap.appendChild(nameLabel);

        // 混合模式
        const mixWrap = document.createElement("div");
        mixWrap.className = "layer-mix";

        const mixButton = document.createElement("button");
        mixButton.type = "button";
        mixButton.className = "layer-mix-button";

        const currentBlend =
            blendModes.find((m) => m.value === layer.blend);

        mixButton.innerHTML = `
            <span>${currentBlend ? currentBlend.label : "正常"}</span>
            <span>▼</span>
        `;

        const dropdown = document.createElement("div");
        dropdown.className = "layer-mix-dropdown";

        blendModes.forEach((mode) => {

            const option = document.createElement("button");

            option.type = "button";
            option.className = "layer-mix-option";

            option.textContent = mode.label;

            option.addEventListener("click", (event) => {

                event.stopPropagation();
                if (isRoomEventActive("tool_grab") && !hasToolGrabPermission("layer:blend")) {
                    showToast("需要先抢到混合模式权限");
                    return;
                }

                layer.blend = mode.value;

                layer.canvas.style.mixBlendMode = layer.blend;

                updateLayerList();

                pushHistory();
                emitLayerUpdate(layer, { blend: layer.blend });
            });

            dropdown.appendChild(option);
        });

        let open = false;

        mixButton.addEventListener("click", (event) => {

            event.stopPropagation();

            open = !open;

            dropdown.classList.toggle("open", open);
        });

        mixWrap.appendChild(mixButton);
        mixWrap.appendChild(dropdown);

        // 锁定按钮
        const lockBtn = document.createElement("button");
        lockBtn.type = "button";
        lockBtn.className = "layer-mini-btn";

        if (layer.locked) {
            lockBtn.classList.add("locked");
        }

        lockBtn.textContent =
            layer.locked ? "🔒" : "🔓";

        lockBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            layer.locked = !layer.locked;

            updateLayerList();
            pushHistory();
            emitLayerUpdate(layer, { locked: layer.locked });
        });

        // 显示隐藏
        const visBtn = document.createElement("button");
        visBtn.type = "button";
        visBtn.className = "layer-mini-btn";
        visBtn.textContent =
            layer.visible ? "👁" : "🚫";
        if (!layer.visible) {
            visBtn.classList.add("hidden");
        }

        visBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            layer.visible = !layer.visible;
            layer.canvas.style.display = layer.visible
                ? "block"
                : "none";

            updateLayerList();
            pushHistory();
            emitLayerUpdate(layer, { visible: layer.visible });
        });
        //拖拽图层排序
        dragHandle.addEventListener("dragstart", (event) => {

            item.classList.add("dragging");

            event.dataTransfer.setData(
                "text/plain",
                String(layer.id)
            );
        });

        dragHandle.addEventListener("dragend", () => {

            item.classList.remove("dragging");

            pushHistory();
        });
        item.addEventListener("dragover", (event) => {

            event.preventDefault();
        });
        item.addEventListener("drop", (event) => {

            event.preventDefault();

            const draggingId = Number(
                event.dataTransfer.getData("text/plain")
            );

            const targetId = layer.id;

            if (draggingId === targetId) {
                return;
            }

            const fromIndex = layers.findIndex(
                (l) => l.id === draggingId
            );

            const toIndex = layers.findIndex(
                (l) => l.id === targetId
            );

            if (fromIndex === -1 || toIndex === -1) {
                return;
            }

            const movedLayer =
                layers.splice(fromIndex, 1)[0];

            layers.splice(toIndex, 0, movedLayer);

            syncLayerDomOrder();

            updateLayerList();
            pushHistory();
            emitLayerReorder();
        });








        // 删除按钮
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "layer-mini-btn delete";
        delBtn.textContent = "✕";

        delBtn.disabled = layers.length <= 1;

        delBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            if (layers.length <= 1) {
                return;
            }

            const idx = layers.findIndex(
                (l) => l.id === layer.id
            );

            if (idx === -1) {
                return;
            }

            layers.splice(idx, 1);

            if (activeLayerId === layer.id) {
                const fallback =
                    layers[Math.max(0, idx - 1)] || layers[0];

                activeLayerId = fallback.id;
            }

            syncLayerDomOrder();
            updateLayerList();
            pushHistory();
            if (currentRoom) {
                socket.emit("operation", {
                    room: currentRoom,
                    operation: {
                        type: "layer_delete",
                        layerId: layer.id,
                        activeLayerId
                    }
                });
            }
        });

        item.appendChild(thumb);
        item.appendChild(nameWrap);
        item.appendChild(mixWrap);
        const opacityWrap = document.createElement("div");

        opacityWrap.className = "layer-opacity";

        const opacitySlider = document.createElement("input");

        opacitySlider.type = "range";
        opacitySlider.min = "0";
        opacitySlider.max = "100";
        opacitySlider.value = String(layer.opacity * 100);

        const opacityText = document.createElement("span");

        opacityText.textContent =
            `${Math.round(layer.opacity * 100)}%`;

        opacitySlider.addEventListener("input", (event) => {

            event.stopPropagation();

            layer.opacity =
                Number(opacitySlider.value) / 100;

            layer.canvas.style.opacity =
                layer.opacity;

            opacityText.textContent =
                `${opacitySlider.value}%`;
        });

        opacitySlider.addEventListener("change", () => {
            pushHistory();
            emitLayerUpdate(layer, { opacity: layer.opacity });
        });

        opacityWrap.appendChild(opacitySlider);
        opacityWrap.appendChild(opacityText);

        item.appendChild(opacityWrap);
        item.appendChild(lockBtn);
        item.appendChild(visBtn);
        item.appendChild(delBtn);
        item.appendChild(dragHandle);

        layerList.appendChild(item);
    }
}



function addLayer() {
    if (layers.length >= maxLayers) return;
    if (isRoomEventActive("tool_grab") && !hasToolGrabPermission("layer:create")) {
        showToast("需要先抢到图层创建权限");
        return;
    }
    const layer = createLayer(`图层 ${layers.length + 1}`);
    layers.push(layer);
    activeLayerId = layer.id;
    syncLayerDomOrder();
    updateLayerList();
    pushHistory();
    if (currentRoom) {
        socket.emit("operation", {
            room: currentRoom,
            operation: {
                type: "layer_create",
                layer: {
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    locked: layer.locked,
                    blend: layer.blend,
                    opacity: layer.opacity
                },
                activeLayerId: layer.id
            }
        });
    }
}

function createCompositeCanvas() {
    const out = document.createElement("canvas");
    out.width = canvasWidth;
    out.height = canvasHeight;
    const outCtx = out.getContext("2d");
    for (const layer of layers) {
        if (!layer.visible) continue;
        outCtx.globalCompositeOperation = layer.blend === "normal" ? "source-over" : layer.blend;
        outCtx.drawImage(layer.canvas, 0, 0);
    }
    outCtx.globalCompositeOperation = "source-over";
    return out;
}

function saveAsPng() {
    const merged = createCompositeCanvas();
    const link = document.createElement("a");
    link.href = merged.toDataURL("image/png");
    link.download = `tea-paint-${Date.now()}.png`;
    link.click();
}

function getRawCanvasPos(event) {
    const rect = canvasStage.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvasWidth / rect.width),
        y: (event.clientY - rect.top) * (canvasHeight / rect.height)
    };
}

function getMirrorCompensatedCanvasPos(rawPos) {
    return {
        x: isMirrorAxisActive("horizontal") ? canvasWidth - rawPos.x : rawPos.x,
        y: isMirrorAxisActive("vertical") ? canvasHeight - rawPos.y : rawPos.y
    };
}

function getCanvasPosFromRaw(rawPos) {
    const inputPos = getMirrorCompensatedCanvasPos(rawPos);
    if (!isRoomEventActive("reverse_mouse") || !isDrawing) {
        return inputPos;
    }

    return {
        x: clamp(lastX - (inputPos.x - lastInputX), 0, canvasWidth),
        y: clamp(lastY - (inputPos.y - lastInputY), 0, canvasHeight)
    };
}

function getCanvasPos(event) {
    return getCanvasPosFromRaw(getRawCanvasPos(event));
}


function drawSoftBrush(
    ctx,
    x,
    y,
    size,
    color,
    opacity,
    hardness
) {
    const radius = size / 2;

    const gradient = ctx.createRadialGradient(
        x,
        y,
        radius * hardness,
        x,
        y,
        radius
    );

    gradient.addColorStop(0, color);

    gradient.addColorStop(
        hardness,
        color
    );

    const transparent =
        color.startsWith("#")
            ? hexToRgba(color, 0)
            : color.replace(/[\d.]+\)$/,"0)");

    gradient.addColorStop(1, transparent);

    ctx.fillStyle = gradient;
    ctx.globalAlpha = opacity;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
}
function updateCursorStyle() {
    const scale = canvasStage.getBoundingClientRect().width / canvasWidth;
    const px = Math.max(1, getEventBrushSize() * scale);
    cursorEl.style.width = `${px}px`;
    cursorEl.style.height = `${px}px`;
    cursorEl.classList.toggle("eraser", toolState.mode === "eraser");
}

function updateCursorPosition(event) {
    if (isPanMode) {
        cursorEl.style.display = "none";
        return;
    }
    const rect = canvasStage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        cursorEl.style.display = "none";
        return;
    }
    cursorEl.style.left = `${x}px`;
    cursorEl.style.top = `${y}px`;
    cursorEl.style.display = "block";
}

function hideCursor() {
    cursorEl.style.display = "none";
}
function hexToRgba(hex, alpha) {

    const rgb = hexToRgb(hex);

    return `rgba(
        ${rgb.r},
        ${rgb.g},
        ${rgb.b},
        ${alpha}
    )`;
}
function startDrawing(event) {

    if (isPanMode || isRestoring) return;

    const layer = getActiveLayer();

    if (!layer || !layer.visible) return;

    if (layer.locked) {
        showToast("该图层已被锁定");
        return;
    }

    isDrawing = true;

    hasDrawnOnCurrentStroke = false;
    currentStrokeId =
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    currentStrokeColor =
        isRoomEventActive("random_color") && toolState.mode === "brush"
            ? randomHexColor()
            : null;

    const pos = getMirrorCompensatedCanvasPos(getRawCanvasPos(event));

    lastX = pos.x;
    lastY = pos.y;
    lastInputX = pos.x;
    lastInputY = pos.y;
}
function draw(event) {

    if (!isDrawing) return;

    const layer = getActiveLayer();

    if (!layer) return;

    const rawPos = getRawCanvasPos(event);
    const inputPos = getMirrorCompensatedCanvasPos(rawPos);
    const pos = getCanvasPosFromRaw(rawPos);
    const drawSize = getEventBrushSize();
    const drawColor = getDrawColor();

    const ctx = layer.ctx;

    const dx = pos.x - lastX;
    const dy = pos.y - lastY;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    const spacing =
        Math.max(1, drawSize * 0.12);

    // 重置
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // =========================
    // 柔边喷枪（特殊）
    // =========================

    if (toolState.brushPreset === "soft") {

        ctx.globalCompositeOperation =
            "source-over";

        const flow =
            Math.pow(
                toolState.opacity || 1,
                2.2
            ) * 0.55;

        for (
            let i = 0;
            i <= distance;
            i += spacing
        ) {

            const t =
                distance === 0
                    ? 0
                    : i / distance;

            const x =
                lastX + dx * t;

            const y =
                lastY + dy * t;

            const radius =
                drawSize / 2;

            const gradient =
                ctx.createRadialGradient(
                    x,
                    y,
                    0,
                    x,
                    y,
                    radius
                );

            gradient.addColorStop(
                0,
                hexToRgba(
                    drawColor,
                    flow
                )
            );

            gradient.addColorStop(
                1,
                hexToRgba(
                    drawColor,
                    0
                )
            );

            ctx.fillStyle = gradient;

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    // =========================
    // 其余线类笔刷
    // =========================

    else {

        // 默认参数
        ctx.beginPath();

        ctx.moveTo(lastX, lastY);

        ctx.lineTo(pos.x, pos.y);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // =========================
        // 橡皮
        // =========================

        if (toolState.mode === "eraser") {

            ctx.globalCompositeOperation =
                "destination-out";

            ctx.strokeStyle =
                "rgba(0,0,0,1)";

            ctx.lineWidth =
                drawSize;

            ctx.globalAlpha =
                toolState.opacity || 1;
        }

        // =========================
        // 铅笔
        // =========================

        else if (
            toolState.brushPreset === "pencil"
        ) {

            ctx.globalCompositeOperation =
                "source-over";

            ctx.strokeStyle =
                drawColor;

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                drawSize;

            // 重新做抖动
            ctx.beginPath();

            ctx.moveTo(lastX, lastY);

            ctx.lineTo(
                pos.x +
                    (Math.random() - 0.5) * 0.6,
                pos.y +
                    (Math.random() - 0.5) * 0.6
            );
        }

        // =========================
        // 墨线
        // =========================

        else if (
            toolState.brushPreset === "ink"
        ) {

            ctx.globalCompositeOperation =
                "source-over";

            ctx.strokeStyle =
                drawColor;

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                drawSize *
                (0.7 + Math.random() * 0.15);

            ctx.lineCap = "round";
        }

        // =========================
        // 马克笔
        // =========================

        else if (
            toolState.brushPreset === "marker"
        ) {

            ctx.globalCompositeOperation =
                "multiply";

            ctx.strokeStyle =
                drawColor;

            ctx.globalAlpha =
                (toolState.opacity || 1) * 0.18;

            ctx.lineWidth =
                drawSize;

            ctx.lineCap = "square";
        }

        // =========================
        // 默认笔刷
        // =========================

        else {

            ctx.globalCompositeOperation =
                "source-over";

            ctx.strokeStyle =
                drawColor;

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                drawSize;
        }

        // 统一 stroke
        ctx.stroke();
        socket.emit("draw", {

        room: currentRoom,
        layerId: activeLayerId,
        strokeId: currentStrokeId,

        x1: lastX,
        y1: lastY,

        x2: pos.x,
        y2: pos.y,

        color: drawColor,

        size: drawSize,

        opacity: toolState.opacity,

        preset: toolState.brushPreset,

        mode: toolState.mode
    });
    }

    // reset
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    lastX = pos.x;
    lastY = pos.y;
    lastInputX = inputPos.x;
    lastInputY = inputPos.y;

    hasDrawnOnCurrentStroke = true;
}
function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (hasDrawnOnCurrentStroke && toolState.mode === "brush") {
        pushHistoryColor(getDrawColor());
    }
    currentStrokeId = null;
    currentStrokeColor = null;
    pushHistory();
}

function clearCurrentLayer() {
    const layer = getActiveLayer();
    if (!layer) return;
    if (layer.locked) {
        showToast("该图层已被锁定");
        return;
    }
    layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    pushHistory();
    if (currentRoom) {

    socket.emit(
        "clear",
        {
            room: currentRoom,
            layerId: layer.id
        }
    );
}
}

function updateActiveCards() {
    document.querySelectorAll(".tool-card").forEach((card) => {
        const mode = card.dataset.mode;
        const id = card.dataset.id;
        const active = mode === "brush"
            ? toolState.brushPreset === id
            : toolState.eraserPreset === id;
        card.classList.toggle("active", active);
    });
    updateToolGrabRestrictedUI();
}

function selectTool(mode, presetId, size) {
    const permissionKey = getToolPermissionKey(mode, presetId);
    if (isRoomEventActive("tool_grab") && !hasToolGrabPermission(permissionKey)) {
        showToast("需要先抢到这个工具");
        return;
    }

    toolState.mode = mode;

    const presetList =
        mode === "brush"
            ? brushPresets
            : eraserPresets;

    const preset =
        presetList.find(
            p => p.id === presetId
        );

    if (preset) {

        toolState.size =
            preset.size || size;

        toolState.opacity =
            preset.opacity ?? 1;

        toolState.hardness =
            preset.hardness ?? 1;

        toolState.brushType =
            preset.brushType || "round";
    }

    if (mode === "brush") {
        toolState.brushPreset = presetId;
    } else {
        toolState.eraserPreset = presetId;
    }

    updateActiveCards();

    updateSizeControls();
    updateOpacityControls();
    emitSharedToolbarChange("tool");
}
function createToolCard(mode, preset) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "tool-card";
    card.dataset.mode = mode;
    card.dataset.id = preset.id;

    const preview = document.createElement("div");
    preview.className = "tool-preview";
    const dot = document.createElement("div");
    dot.className = "preview-dot";
    const dotSize = Math.max(4, Math.min(24, Math.round(preset.size / 3)));
    dot.style.width = `${dotSize}px`;
    dot.style.height = `${dotSize}px`;
    preview.appendChild(dot);

    const name = document.createElement("div");
    name.className = "tool-name";
    name.textContent = `${preset.name} (${preset.size}px)`;

    card.appendChild(preview);
    card.appendChild(name);
    card.addEventListener("click", () => selectTool(mode, preset.id, preset.size));
    return card;
}

function renderToolPanels() {
    brushPresets.forEach((preset) => brushGrid.appendChild(createToolCard("brush", preset)));
    eraserPresets.forEach((preset) => eraserGrid.appendChild(createToolCard("eraser", preset)));
    updateActiveCards();
}

function updateFromRgbSvPointer(event) {
    const rect = rgbSvCanvas.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) * (rgbSvCanvas.width / rect.width), 0, rgbSvCanvas.width);
    const y = clamp((event.clientY - rect.top) * (rgbSvCanvas.height / rect.height), 0, rgbSvCanvas.height);
    const s = (x / rgbSvCanvas.width) * 100;
    const v = 100 - (y / rgbSvCanvas.height) * 100;
    applyHsv(colorState.h, s, v);
}

function updateFromWheelPointer(event, dragType) {
    const rect = wheelCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (wheelCanvas.width / rect.width);
    const y = (event.clientY - rect.top) * (wheelCanvas.height / rect.height);
    const cx = wheelCanvas.width / 2;
    const cy = wheelCanvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const squareHalf = 62;
    const squareX = cx - squareHalf;
    const squareY = cy - squareHalf;
    const squareSize = squareHalf * 2;

    if (dragType === "ring") {
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        applyHsv(angle, colorState.s, colorState.v);
        return;
    }

    if (dragType === "square") {
        const sx = clamp(x, squareX, squareX + squareSize);
        const sy = clamp(y, squareY, squareY + squareSize);
        const s = ((sx - squareX) / squareSize) * 100;
        const v = 100 - ((sy - squareY) / squareSize) * 100;
        applyHsv(colorState.h, s, v);
    }
}

function detectWheelRegion(event) {
    const rect = wheelCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (wheelCanvas.width / rect.width);
    const y = (event.clientY - rect.top) * (wheelCanvas.height / rect.height);
    const cx = wheelCanvas.width / 2;
    const cy = wheelCanvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outerRadius = 110;
    const innerRadius = 86;
    const squareHalf = 62;
    const squareX = cx - squareHalf;
    const squareY = cy - squareHalf;
    const squareSize = squareHalf * 2;
    if (dist >= innerRadius && dist <= outerRadius) return "ring";
    if (x >= squareX && x <= squareX + squareSize && y >= squareY && y <= squareY + squareSize) return "square";
    return null;
}

function bindRangeAndNumber(rangeEl, numberEl, min, max, onChange) {
    rangeEl.addEventListener("input", () => {
        const value = clamp(Number(rangeEl.value), min, max);
        numberEl.value = String(value);
        onChange(value);
    });
    numberEl.addEventListener("input", () => {
        const value = clamp(Number(numberEl.value || min), min, max);
        rangeEl.value = String(value);
        onChange(value);
    });
}

function snapshotState() {
    return {
        canvasWidth,
        canvasHeight,
        activeLayerId,
        layerIdSeq,
        layers: layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            blend: layer.blend,
            image: layer.canvas.toDataURL("image/png")
        }))
    };
}

function pushHistory() {
    const snap = snapshotState();
    undoStack.push(snap);
    if (undoStack.length > maxHistory + 1) undoStack.shift();
    redoStack.length = 0;
}

function restoreFromState(state) {
    isRestoring = true;
    canvasWidth = state.canvasWidth;
    canvasHeight = state.canvasHeight;
    layerIdSeq = state.layerIdSeq;
    canvasWidthInput.value = String(canvasWidth);
    canvasHeightInput.value = String(canvasHeight);
    layers = [];
    layerStack.innerHTML = "";

    const jobs = state.layers.map((meta) => new Promise((resolve) => {
        const layer = createLayer(meta.name, meta.id);
        layer.visible = meta.visible;
        layer.locked = meta.locked || false;
        layer.blend = meta.blend;
        layer.canvas.style.mixBlendMode = layer.blend;
        layer.canvas.style.display = layer.visible ? "block" : "none";
        const img = new Image();
        img.onload = () => {
            layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            layer.ctx.drawImage(img, 0, 0);
            layers.push(layer);
            resolve();
        };
        img.src = meta.image;
    }));

    Promise.all(jobs).then(() => {
        activeLayerId = state.activeLayerId;
        if (!layers.some((l) => l.id === activeLayerId) && layers[0]) activeLayerId = layers[0].id;
        syncLayerDomOrder();
        updateLayerList();
        setZoom(zoomPercent);
        isRestoring = false;
    });
}

function updateHistoryQuotaUI() {
    if (!currentRoom || !isRoomEventActive("shared_history")) {
        undoBtn.textContent = "撤销";
        redoBtn.textContent = "重做";
        undoBtn.disabled = false;
        redoBtn.disabled = false;
        updateToolGrabRestrictedUI();
        return;
    }

    const undoTokens = Math.max(0, Math.floor(historyQuota.undoTokens));
    const redoTokens = Math.max(0, Math.floor(historyQuota.redoTokens));
    const maxTokens = historyQuota.maxTokens || 10;
    undoBtn.textContent = `撤销 ${undoTokens}/${maxTokens}`;
    redoBtn.textContent = `重做 ${redoTokens}/${maxTokens}`;
    undoBtn.disabled = undoTokens <= 0;
    redoBtn.disabled = redoTokens <= 0;
    updateToolGrabRestrictedUI();
}

function syncHistoryQuota(quota) {
    historyQuota = {
        undoTokens: Number(quota?.undoTokens ?? quota?.tokens ?? historyQuota.undoTokens ?? 10),
        redoTokens: Number(quota?.redoTokens ?? quota?.tokens ?? historyQuota.redoTokens ?? 10),
        maxTokens: Number(quota?.maxTokens ?? historyQuota.maxTokens ?? 10),
        recoverSeconds: Number(quota?.recoverSeconds ?? historyQuota.recoverSeconds ?? 1),
        lastUpdate: Date.now(),
    };
    updateHistoryQuotaUI();
}

function startHistoryQuotaTimer() {
    if (historyQuotaTimer) clearInterval(historyQuotaTimer);
    historyQuotaTimer = setInterval(() => {
        if (!currentRoom || !isRoomEventActive("shared_history")) return;
        const now = Date.now();
        const recoverMs = Math.max(1, historyQuota.recoverSeconds || 1) * 1000;
        const recovered = Math.floor((now - historyQuota.lastUpdate) / recoverMs);
        if (recovered <= 0) return;

        historyQuota.undoTokens = Math.min(
            historyQuota.maxTokens || 10,
            Math.floor(historyQuota.undoTokens || 0) + recovered
        );
        historyQuota.redoTokens = Math.min(
            historyQuota.maxTokens || 10,
            Math.floor(historyQuota.redoTokens || 0) + recovered
        );
        historyQuota.lastUpdate += recovered * recoverMs;
        updateHistoryQuotaUI();
    }, 1000);
}

function undo() {
    if (currentRoom && isRoomEventActive("tool_grab") && !hasToolGrabPermission("history:undo")) {
        showToast("需要先抢到撤回权限");
        return;
    }
    if (currentRoom && isRoomEventActive("shared_history")) {
        if (historyQuota.undoTokens <= 0) {
            showToast("撤回次数恢复中");
            return;
        }
        socket.emit("undo", { room: currentRoom });
        return;
    }
    if (undoStack.length <= 1 || isRestoring) return;
    const current = undoStack.pop();
    redoStack.push(current);
    restoreFromState(undoStack[undoStack.length - 1]);
}

function redo() {
    if (currentRoom && isRoomEventActive("tool_grab") && !hasToolGrabPermission("history:redo")) {
        showToast("需要先抢到重做权限");
        return;
    }
    if (currentRoom && isRoomEventActive("shared_history")) {
        if (historyQuota.redoTokens <= 0) {
            showToast("重做次数恢复中");
            return;
        }
        socket.emit("redo", { room: currentRoom });
        return;
    }
    if (redoStack.length === 0 || isRestoring) return;
    const next = redoStack.pop();
    undoStack.push(next);
    restoreFromState(next);
}

function resizeAllLayers() {
    const nextW = clamp(Number(canvasWidthInput.value) || canvasWidth, minCanvasW, maxCanvasSize);
    const nextH = clamp(Number(canvasHeightInput.value) || canvasHeight, minCanvasH, maxCanvasSize);
    const oldW = canvasWidth;
    const oldH = canvasHeight;
    if (nextW === oldW && nextH === oldH) return;

    // 本地执行调整
    performResize(nextW, nextH);

    // 广播给其他用户
    if (currentRoom) {
        socket.emit("resize_canvas", {
            room: currentRoom,
            width: nextW,
            height: nextH
        });
    }
}

// 提取实际调整逻辑为独立函数，方便本地和远程调用
function performResize(newWidth, newHeight) {
    const oldW = canvasWidth;
    const oldH = canvasHeight;
    if (newWidth === oldW && newHeight === oldH) return;

    for (const layer of layers) {
        const temp = document.createElement("canvas");
        temp.width = oldW;
        temp.height = oldH;
        temp.getContext("2d").drawImage(layer.canvas, 0, 0);
        layer.canvas.width = newWidth;
        layer.canvas.height = newHeight;
        layer.ctx.clearRect(0, 0, newWidth, newHeight);
        layer.ctx.drawImage(temp, 0, 0);
    }

    canvasWidth = newWidth;
    canvasHeight = newHeight;
    canvasWidthInput.value = String(newWidth);
    canvasHeightInput.value = String(newHeight);
    setZoom(zoomPercent);
    pushHistory(); // 保留历史
}



canvasStage.addEventListener("pointerdown", (event) => {

    if (event.pointerType === "mouse") {
        event.preventDefault();
    }

    startDrawing(event);

    if (isPanMode) {
        startPanning(event);
    }
});

canvasStage.addEventListener("pointermove", (event) => {

    updateCursorPosition(event);

    draw(event);

    if (isPanning) {
        movePanning(event);
    }
});

window.addEventListener("pointerup", () => {

    stopDrawing();

    stopPanning();

    activeWheelDrag = null;

    activeRgbSvDrag = false;
});

canvasStage.addEventListener("pointerenter", updateCursorPosition);

canvasStage.addEventListener("pointerleave", () => {

    stopDrawing();

    hideCursor();
});



canvasZone.addEventListener("wheel", (event) => {
    event.preventDefault();
    const step = event.deltaY > 0 ? -5 : 5;
    zoomAtPoint(zoomPercent + step, event.clientX, event.clientY);
}, { passive: false });

brushPanelBtn.addEventListener("click", () => {
    const wasBrush = toolState.mode === "brush";
    toolState.mode = "brush";
    if (wasBrush) togglePanel("brush");
    else closePanels();
    setPanMode(false);
    updateCursorStyle();
    emitSharedToolbarChange("tool");
});

eraserPanelBtn.addEventListener("click", () => {
    if (
        isRoomEventActive("tool_grab")
        && !hasToolGrabPermission(`eraser:${toolState.eraserPreset}`)
    ) {
        showToast("需要先抢到橡皮权限");
        return;
    }
    const wasEraser = toolState.mode === "eraser";
    toolState.mode = "eraser";
    if (wasEraser) togglePanel("eraser");
    else closePanels();
    setPanMode(false);
    updateCursorStyle();
    emitSharedToolbarChange("tool");
});

panToolBtn.addEventListener("click", () => setPanMode(!isPanMode));

sizeSlider.addEventListener("input", () => {
    sizeInput.value = sizeSlider.value;
    setToolSize(sizeSlider.value);
    scheduleSharedToolbarChange("size");
});

sizeInput.addEventListener("input", () => {
    const value = clamp(Number(sizeInput.value) || 1, 1, 500);
    setToolSize(value);
    scheduleSharedToolbarChange("size");
});
opacitySlider.addEventListener("input", () => {

    const value =
        clamp(Number(opacitySlider.value), 1, 100);

    toolState.opacity = value / 100;

    updateOpacityControls();
    scheduleSharedToolbarChange("opacity");
});

opacityInput.addEventListener("input", () => {

    const value =
        clamp(Number(opacityInput.value), 1, 100);

    toolState.opacity = value / 100;

    updateOpacityControls();
    scheduleSharedToolbarChange("opacity");
});
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
saveBtn.addEventListener("click", saveAsPng);
clearBtn.addEventListener("click", clearCurrentLayer);

resizeCanvasBtn.addEventListener("click", resizeAllLayers);
zoomSlider.addEventListener("input", () => setZoom(Number(zoomSlider.value)));
zoomInput.addEventListener("input", () => setZoom(Number(zoomInput.value)));
resetZoomBtn.addEventListener("click", () => setZoom(100));

rgbModeBtn.addEventListener("click", () => showColorMode("rgb"));
wheelModeBtn.addEventListener("click", () => showColorMode("wheel"));

activeColorPicker.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleColorPopover();
});

primarySlot.addEventListener("click", () => setActiveSlot("primary"));
secondarySlot.addEventListener("click", () => setActiveSlot("secondary"));
swapColorsBtn.addEventListener("click", swapSlots);

bindRangeAndNumber(rRange, rInput, 0, 255, (value) => applyRgb(value, colorState.g, colorState.b));
bindRangeAndNumber(gRange, gInput, 0, 255, (value) => applyRgb(colorState.r, value, colorState.b));
bindRangeAndNumber(bRange, bInput, 0, 255, (value) => applyRgb(colorState.r, colorState.g, value));
bindRangeAndNumber(hRange, hInput, 0, 360, (value) => applyHsv(value, colorState.s, colorState.v));
bindRangeAndNumber(sRange, sInput, 0, 100, (value) => applyHsv(colorState.h, value, colorState.v));
bindRangeAndNumber(vRange, vInput, 0, 100, (value) => applyHsv(colorState.h, colorState.s, value));

rgbHueRange.addEventListener("input", () => {
    applyHsv(Number(rgbHueRange.value), colorState.s, colorState.v);
});

rgbSvCanvas.addEventListener("pointerdown", (event) => {

    rgbSvCanvas.setPointerCapture(
        event.pointerId
    );

    activeRgbSvDrag = true;

    updateFromRgbSvPointer(event);
});
wheelCanvas.addEventListener("pointerdown", (event) => {

    wheelCanvas.setPointerCapture(
        event.pointerId
    );

    const region =
        detectWheelRegion(event);

    if (!region) return;

    activeWheelDrag = region;

    updateFromWheelPointer(
        event,
        region
    );
});

layerDrawerToggle.addEventListener("click", toggleLayerDrawer);
addLayerBtn.addEventListener("click", addLayer);

document.addEventListener("pointerdown", (event) => {
    const clickedInsidePopover = colorPopover.contains(event.target);
    const clickedTrigger = activeColorPicker.contains(event.target);
    if (!clickedInsidePopover && !clickedTrigger) closeColorPopover();
});

function initLayers() {
    layers = [];
    const base = createLayer("图层 1");
    layers.push(base);
    activeLayerId = base.id;
    syncLayerDomOrder();
    updateLayerList();
}
opacitySlider.addEventListener("input", () => {

    toolState.opacity =
        Number(opacitySlider.value) / 100;
    scheduleSharedToolbarChange("opacity");
});
window.addEventListener("keydown", (event) => {

    if (event.key === "[") {
        setToolSize(toolState.size - 2);
        scheduleSharedToolbarChange("size");
    }

    if (event.key === "]") {
        setToolSize(toolState.size + 2);
        scheduleSharedToolbarChange("size");
    }
});

renderToolPanels();
closePanels();
updateSizeControls();
updateOpacityControls();
setActiveSlot("primary");
showColorMode("rgb");
setZoom(100);
setPanMode(false);
renderColorHistory();
initLayers();
pushHistory();
startHistoryQuotaTimer();



// ========================
// 多人协作
// ========================

function getLayerById(layerId) {
    return layers.find((layer) => layer.id === layerId) || null;
}

function createRemoteLayer(meta) {
    if (getLayerById(meta.id)) return;
    const layer = createLayer(meta.name || `Layer ${meta.id}`, meta.id);
    layer.visible = meta.visible !== false;
    layer.locked = Boolean(meta.locked);
    layer.blend = meta.blend || "normal";
    layer.opacity = meta.opacity ?? 1;
    layer.canvas.style.mixBlendMode = layer.blend;
    layer.canvas.style.opacity = layer.opacity;
    layers.push(layer);
    activeLayerId = meta.activeLayerId || layer.id;
    syncLayerDomOrder();
    updateLayerList();
    setZoom(zoomPercent);
}

function removeRemoteLayer(layerId, nextActiveLayerId = null) {
    if (layers.length <= 1) return;
    const idx = layers.findIndex((layer) => layer.id === layerId);
    if (idx === -1) return;
    layers.splice(idx, 1);
    if (activeLayerId === layerId) {
        const fallback = nextActiveLayerId
            ? getLayerById(nextActiveLayerId)
            : (layers[Math.max(0, idx - 1)] || layers[0]);
        activeLayerId = fallback.id;
    }
    syncLayerDomOrder();
    updateLayerList();
}

function applyOperation(op) {
    if (!op) return;

    if (op.type === "layer_create") {
        createRemoteLayer({ ...op.layer, activeLayerId: op.activeLayerId });
        return;
    }

    if (op.type === "layer_delete") {
        removeRemoteLayer(op.layerId, op.activeLayerId);
        return;
    }

    if (op.type === "layer_update") {
        const layer = getLayerById(op.layerId);
        if (!layer) return;
        Object.assign(layer, op.changes || {});
        if (op.changes?.blend !== undefined) {
            layer.canvas.style.mixBlendMode = layer.blend;
        }
        if (op.changes?.opacity !== undefined) {
            layer.canvas.style.opacity = layer.opacity;
        }
        if (op.changes?.visible !== undefined) {
            layer.canvas.style.display = layer.visible ? "block" : "none";
        }
        syncLayerDomOrder();
        updateLayerList();
        return;
    }

    if (op.type === "layer_reorder") {
        const order = op.order || [];
        layers.sort((a, b) => {
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
        });
        if (op.activeLayerId && getLayerById(op.activeLayerId)) {
            activeLayerId = op.activeLayerId;
        }
        syncLayerDomOrder();
        updateLayerList();
        return;
    }

    if (op.type === "clear_layer") {
        const layer = getLayerById(op.layerId);
        if (!layer) return;
        layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        return;
    }

    if (op.type !== "stroke") return;

    const layer = getLayerById(op.layerId) || getActiveLayer();
    if (!layer) return;
    const ctx = layer.ctx;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
        op.mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle =
        op.mode === "eraser" ? "rgba(0,0,0,1)" : op.color;
    ctx.globalAlpha = op.opacity ?? 1;
    ctx.lineWidth = op.size;
    ctx.beginPath();
    ctx.moveTo(op.x1, op.y1);
    ctx.lineTo(op.x2, op.y2);
    ctx.stroke();
    ctx.restore();
}

function resetForOperationReplay() {
    layers = [];
    layerStack.innerHTML = "";
    layerIdSeq = 1;
    const base = createLayer("图层 1", 1);
    layers.push(base);
    activeLayerId = base.id;
    syncLayerDomOrder();
    updateLayerList();
    setZoom(zoomPercent);
}

function rebuildFromOperations(operations) {
    isRestoring = true;
    resetForOperationReplay();
    for (const op of operations || []) {
        applyOperation(op);
    }
    syncLayerDomOrder();
    updateLayerList();
    setZoom(zoomPercent);
    isRestoring = false;
}

function formatCountdownSeconds(seconds) {
    const clamped = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(clamped / 60);
    const remainingSeconds = clamped % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getEventNowMs() {
    return Date.now() + eventServerOffsetMs;
}

function syncEventServerClock(payload) {
    if (!payload || payload.serverNow === undefined) return;
    eventServerOffsetMs = Number(payload.serverNow || 0) * 1000 - Date.now();
}

function isStaleEventPayload(payload) {
    const payloadVersion = Number(payload?.eventVersion || 0);
    const stateVersion = Number(eventControlState?.eventVersion || 0);
    return payloadVersion > 0 && stateVersion > 0 && payloadVersion < stateVersion;
}

function getStateActiveEvents() {
    if (Array.isArray(eventControlState?.activeEvents)) {
        return eventControlState.activeEvents;
    }
    return eventControlState?.activeEvent ? [eventControlState.activeEvent] : [];
}

function setEventControlCollapsed(collapsed) {
    isEventControlCollapsed = Boolean(collapsed);
    eventControl.classList.toggle("collapsed", isEventControlCollapsed);
    eventControlToggle.textContent = isEventControlCollapsed ? "展开" : "收起";
}

function updateEventCountdownDisplay() {
    if (!eventControlState) {
        eventCurrentLabel.textContent = "当前暂无事件";
        eventCurrentCountdown.textContent = "结束倒计时 —";
        eventNextCountdown.textContent = "下一轮 —";
        return;
    }

    const now = getEventNowMs();
    const activeEvents = getStateActiveEvents();
    if (activeEvents.length) {
        eventCurrentLabel.textContent =
            activeEvents.length === 1
                ? activeEvents[0].label || activeEvents[0].type || "当前事件"
                : `当前 ${activeEvents.length} 个事件`;
        const nearestEnd = Math.min(
            ...activeEvents.map((eventData) => Number(eventData.endsAt || 0))
        );
        const remaining = (nearestEnd * 1000 - now) / 1000;
        eventCurrentCountdown.textContent = `最近结束 ${formatCountdownSeconds(remaining)}`;
    } else {
        eventCurrentLabel.textContent = "当前暂无事件";
        eventCurrentCountdown.textContent = "结束倒计时 —";
    }

    const nextAt = Number(eventControlState.nextEventAt || 0);
    const nextRemaining = (nextAt * 1000 - now) / 1000;
    eventNextCountdown.textContent = `下一轮 ${formatCountdownSeconds(nextRemaining)}`;
    renderActiveEventList();
}

function setEventControlsEnabled(enabled) {
    const isReady = Boolean(enabled);
    eventDurationInput.disabled = !isReady;
    eventIntervalInput.disabled = !isReady;
    eventNextSelect.disabled = !isReady;
    eventNextApplyBtn.disabled = !isReady;
    eventForceNextBtn.disabled = !isReady;
    eventForceEndBtn.disabled = !isReady;
}

function syncEventSettings(settings) {
    if (!currentRoom) return;

    const currentSettings = eventControlState?.settings || {};
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(settings, key);
    const nextSettings = {
        duration: Number(hasOwn("duration") ? settings.duration : currentSettings.duration ?? 120),
        interval: Number(hasOwn("interval") ? settings.interval : currentSettings.interval ?? 120),
        disabled: hasOwn("disabled") && Array.isArray(settings.disabled)
            ? settings.disabled.slice()
            : Array.isArray(currentSettings.disabled)
                ? currentSettings.disabled.slice()
                : [],
        nextKey: hasOwn("nextKey") ? settings.nextKey : currentSettings.nextKey ?? null,
    };

    eventControlState = {
        ...(eventControlState || {}),
        settings: nextSettings,
    };

    updateEventControlUI();
    socket.emit("event_settings", {
        room: currentRoom,
        settings,
    });
}

function toggleEventDisabled(key) {
    if (!currentRoom || !eventControlState) return;

    const currentSettings = eventControlState.settings || {};
    const disabled = new Set(Array.isArray(currentSettings.disabled) ? currentSettings.disabled : []);
    if (disabled.has(key)) disabled.delete(key);
    else disabled.add(key);

    const nextSettings = {
        ...currentSettings,
        disabled: [...disabled],
    };

    if (nextSettings.nextKey === key) {
        nextSettings.nextKey = null;
    }

    syncEventSettings(nextSettings);
}

function renderEventPool() {
    const pool = eventControlState?.eventPool || [];
    const settings = eventControlState?.settings || {};
    const disabled = new Set(Array.isArray(settings.disabled) ? settings.disabled : []);

    eventPoolGrid.innerHTML = "";

    if (!pool.length) {
        const empty = document.createElement("div");
        empty.className = "event-pool-item";
        empty.textContent = "等待房间同步...";
        eventPoolGrid.appendChild(empty);
        return;
    }

    for (const item of pool) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "event-pool-item";
        button.classList.toggle("disabled", disabled.has(item.key));
        button.classList.toggle("active", settings.nextKey === item.key);
        button.innerHTML = `<span>${item.label}</span><small>${disabled.has(item.key) ? "已禁用" : "可用"}</small>`;
        button.addEventListener("click", () => toggleEventDisabled(item.key));
        eventPoolGrid.appendChild(button);
    }
}

function renderActiveEventList() {
    const activeEvents = getStateActiveEvents();
    const now = getEventNowMs();
    eventActiveList.innerHTML = "";

    if (!activeEvents.length) {
        const empty = document.createElement("div");
        empty.className = "event-active-empty";
        empty.textContent = "暂无进行中事件";
        eventActiveList.appendChild(empty);
        return;
    }

    for (const eventData of activeEvents) {
        const item = document.createElement("div");
        item.className = "event-active-item";

        const info = document.createElement("div");
        const name = document.createElement("div");
        name.className = "event-active-name";
        name.textContent = eventData.label || getEventLabel(eventData);

        const time = document.createElement("div");
        time.className = "event-active-time";
        const remaining = (Number(eventData.endsAt || 0) * 1000 - now) / 1000;
        time.textContent = `剩余 ${formatCountdownSeconds(remaining)}`;

        const endBtn = document.createElement("button");
        endBtn.type = "button";
        endBtn.className = "event-active-end-btn";
        endBtn.disabled = !currentRoom;
        endBtn.textContent = "结束";
        endBtn.addEventListener("click", () => {
            if (!currentRoom) return;
            socket.emit("force_end_event", {
                room: currentRoom,
                eventId: eventData.id,
            });
        });

        info.appendChild(name);
        info.appendChild(time);
        item.appendChild(info);
        item.appendChild(endBtn);
        eventActiveList.appendChild(item);
    }
}

function updateEventControlUI() {
    if (!eventControlState) {
        eventCurrentLabel.textContent = "当前暂无事件";
        eventCurrentCountdown.textContent = "结束倒计时 —";
        eventNextCountdown.textContent = "下一轮 —";
        eventDurationInput.value = "120";
        eventIntervalInput.value = "120";
        eventNextSelect.innerHTML = '<option value="">不指定</option>';
        eventActiveList.innerHTML = "";
        eventPoolGrid.innerHTML = "";
        setEventControlsEnabled(Boolean(currentRoom));
        return;
    }

    const settings = eventControlState.settings || {};
    eventDurationInput.value = String(settings.duration ?? 120);
    eventIntervalInput.value = String(settings.interval ?? 120);

    const pool = eventControlState.eventPool || [];
    eventNextSelect.innerHTML = '<option value="">不指定</option>';
    for (const item of pool) {
        if (Array.isArray(settings.disabled) && settings.disabled.includes(item.key)) {
            continue;
        }
        const option = document.createElement("option");
        option.value = item.key;
        option.textContent = item.label;
        eventNextSelect.appendChild(option);
    }

    if (settings.nextKey && eventNextSelect.querySelector(`option[value="${settings.nextKey}"]`)) {
        eventNextSelect.value = settings.nextKey;
    } else {
        eventNextSelect.value = "";
    }

    renderEventPool();
    updateEventCountdownDisplay();
    setEventControlsEnabled(Boolean(currentRoom));
}

function startEventCountdownTimer() {
    if (eventCountdownTimer) clearInterval(eventCountdownTimer);
    eventCountdownTimer = setInterval(updateEventCountdownDisplay, 1000);
    updateEventCountdownDisplay();
}

function ensureEventBanner() {
    if (eventBanner) return eventBanner;

    eventBanner = document.createElement("div");
    eventBanner.className = "event-banner";
    document.body.appendChild(eventBanner);
    return eventBanner;
}

function syncRoomEventStyles() {
    layerStack.style.filter =
        isRoomEventActive("grayscale") ? "grayscale(1)" : "";

    const mirrorX = isMirrorAxisActive("horizontal");
    const mirrorY = isMirrorAxisActive("vertical");
    if (mirrorX || mirrorY) {
        layerStack.style.transform = `scale(${mirrorX ? -1 : 1}, ${mirrorY ? -1 : 1})`;
        layerStack.style.transformOrigin = "center";
    } else {
        layerStack.style.transform = "";
        layerStack.style.transformOrigin = "";
    }
}

function applyEvent(eventData) {
    if (!eventData) return;
    syncEventServerClock(eventData);
    if (isStaleEventPayload(eventData)) return;

    activeRoomEvents = activeRoomEvents.filter((item) => item.id !== eventData.id);
    activeRoomEvents.push(eventData);
    activeRoomEvent = activeRoomEvents[0] || null;
    syncRoomEventStyles();
    updateCursorStyle();
    updateHistoryQuotaUI();
    ensureAllowedToolDuringGrab();
    updateToolGrabRestrictedUI();
    renderToolDrops();

    const banner = ensureEventBanner();
    banner.textContent = getEventLabel(eventData);
    banner.classList.add("show");
    clearTimeout(eventBannerTimer);
    eventBannerTimer = setTimeout(() => {
        banner.classList.remove("show");
    }, 5000);

    clearTimeout(eventEndTimers.get(eventData.id));
    const remainingMs = Math.max(
        0,
        ((eventData.endsAt || 0) * 1000) - getEventNowMs()
    );

    if (remainingMs > 0) {
        const timer = setTimeout(() => {
            removeEvent(eventData);
        }, remainingMs + 300);
        eventEndTimers.set(eventData.id, timer);
    }
}

function removeEvent(eventData) {
    if (!eventData) {
        for (const timer of eventEndTimers.values()) {
            clearTimeout(timer);
        }
        eventEndTimers.clear();
        activeRoomEvents = [];
        activeRoomEvent = null;
        currentStrokeColor = null;
        clearTimeout(eventEndTimer);
        syncRoomEventStyles();
        updateCursorStyle();
        updateHistoryQuotaUI();
        updateToolGrabRestrictedUI();
        clearToolDropLayer();
        if (eventBanner) {
            eventBanner.classList.remove("show");
        }
        return;
    }

    if (
        eventData?.id &&
        !activeRoomEvents.some((item) => item.id === eventData.id)
    ) {
        return;
    }

    activeRoomEvents = activeRoomEvents.filter((item) => item.id !== eventData.id);
    activeRoomEvent = activeRoomEvents[0] || null;
    currentStrokeColor = null;
    clearTimeout(eventEndTimers.get(eventData.id));
    eventEndTimers.delete(eventData.id);
    clearTimeout(eventEndTimer);
    syncRoomEventStyles();
    updateCursorStyle();
    updateHistoryQuotaUI();
    ensureAllowedToolDuringGrab();
    updateToolGrabRestrictedUI();
    if (!isRoomEventActive("tool_grab")) {
        clearToolDropLayer();
    } else {
        renderToolDrops();
    }

    if (eventBanner && !activeRoomEvents.length) {
        eventBanner.classList.remove("show");
    }
}

setEventControlsEnabled(false);
// setEventControlCollapsed(true);
// startEventCountdownTimer();

currentUsername =
    "画师_" +
    Math.floor(Math.random() * 1000);

updateUserNameDisplay();


    const roomOverlay =
    document.getElementById("roomOverlay");

const roomInput =
    document.getElementById("roomInput");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

joinRoomBtn.addEventListener(
    "click",
    () => {

        const room =
            roomInput.value.trim();

        if (
            room.length !== 4
        ) {
            alert("请输入4位房间号");
            return;
        }

        currentRoom = room;
        setEventControlsEnabled(true);
        updateHistoryQuotaUI();

        socket.emit(
            "join_room",
            {
                room,
                username: currentUsername
            }
        );
        initChallengeWidget();
        socket.emit("get_custom_challenges", { room: currentRoom });

        roomOverlay.style.display =
            "none";
        startAutoSave();
        // 事件管理内嵌面板切换
        const eventManagerBtn = document.getElementById("eventManagerBtn");
        const inlineEventPanel = document.getElementById("inlineEventPanel");
        if (eventManagerBtn && inlineEventPanel) {
            eventManagerBtn.addEventListener("click", () => {
                const isVisible = inlineEventPanel.style.display !== "none";
                inlineEventPanel.style.display = isVisible ? "none" : "block";
            });
        }
    }
);

eventDurationInput.addEventListener("change", () => {
    if (!currentRoom) return;
    syncEventSettings({
        duration: Number(eventDurationInput.value) || 120,
    });
});

eventIntervalInput.addEventListener("change", () => {
    if (!currentRoom) return;
    syncEventSettings({
        interval: Number(eventIntervalInput.value) || 120,
    });
});

eventNextApplyBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    syncEventSettings({
        nextKey: eventNextSelect.value || null,
    });
});

eventForceEndBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    socket.emit("force_end_event", {
        room: currentRoom,
        all: true,
    });
});

eventForceNextBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    socket.emit("force_next_event", { room: currentRoom });
});

// eventControlToggle.addEventListener("click", () => {
//     setEventControlCollapsed(!isEventControlCollapsed);
// });

let presetCategoryNames = []; // 存储分类名

function fetchPresetCategories() {
    fetch("/api/preset_categories")
        .then(res => res.json())
        .then(data => {
            presetCategoryNames = data.categories || [];
        })
        .catch(err => console.warn("获取预设分类失败", err));
}
// 在加入房间后调用
fetchPresetCategories();

socket.on("draw", (data) => {
    applyOperation(data);
});

socket.on("operation", (operation) => {
    applyOperation(operation);
});

socket.on("clear", (operation) => {
    applyOperation(operation);
});

socket.on("sync_history", (data) => {
    rebuildFromOperations(data.operations);
});

socket.on("history_changed", (data) => {
    rebuildFromOperations(data.operations);
});

socket.on("history_quota", (quota) => {
    syncHistoryQuota(quota);
});

socket.on("room_toast", (data) => {
    if (data?.message) {
        showToast(data.message);
    }
});

socket.on("shared_tool_state", (data) => {
    applySharedToolState(data?.state);
});

socket.on("tool_grab_state", (state) => {
    syncToolGrabState(state);
});

socket.on("tool_drop_claimed", (data) => {
    toolGrabState.drops = (toolGrabState.drops || []).filter(
        (drop) => drop.id !== data?.dropId
    );
    renderToolDrops();
});

socket.on("event_state", (eventState) => {
    eventControlState = eventState || null;
    syncEventServerClock(eventState);
    const stateActiveEvents = getStateActiveEvents();
    removeEvent(null);
    if (stateActiveEvents.length) {
        eventControlState = eventState;
        for (const eventData of stateActiveEvents) {
            applyEvent({
                ...eventData,
                eventVersion: eventState.eventVersion,
                serverNow: eventState.serverNow,
            });
        }
    } else if (eventState?.activeEvent) {
        applyEvent({
            ...eventState.activeEvent,
            eventVersion: eventState.eventVersion,
            serverNow: eventState.serverNow,
        });
    } else {
        removeEvent(null);
    }
    eventControlState = eventState || null;
    if (isRoomEventActive("shared_toolbar") && eventState?.sharedToolbarState) {
        applySharedToolState(eventState.sharedToolbarState);
    }
    updateEventControlUI();
});

socket.on("event_start", (eventData) => {
    syncEventServerClock(eventData);
    if (isStaleEventPayload(eventData)) return;
    const currentEvents = getStateActiveEvents().filter((item) => item.id !== eventData.id);
    eventControlState = {
        ...(eventControlState || {}),
        activeEvent: currentEvents[0] || eventData,
        activeEvents: [...currentEvents, eventData],
        eventVersion: eventData?.eventVersion ?? eventControlState?.eventVersion ?? 0,
    };
    applyEvent(eventData);
    updateEventControlUI();
});

socket.on("event_end", (eventData) => {
    syncEventServerClock(eventData);
    if (isStaleEventPayload(eventData)) return;
    const currentEvents = getStateActiveEvents().filter((item) => item.id !== eventData?.id);
    eventControlState = {
        ...(eventControlState || {}),
        activeEvent: currentEvents[0] || null,
        activeEvents: currentEvents,
        eventVersion: eventData?.eventVersion ?? eventControlState?.eventVersion ?? 0,
    };
    removeEvent(eventData);
    updateEventControlUI();
});


socket.on("connect", ()=>{

    console.log("socket connected");

});

socket.on("canvas_resized", (data) => {
    if (!data.width || !data.height) return;
    // 更新输入框的值
    canvasWidthInput.value = data.width;
    canvasHeightInput.value = data.height;
    // 执行本地调整
    performResize(data.width, data.height);
    // 可选：显示提示
    showToast(`画布尺寸已调整为 ${data.width}×${data.height}`);
});

// ===================== 表情轮盘功能 =====================

// 表情轮盘 DOM 元素
const emojiWheel = document.getElementById("emojiWheel");
const emojiWheelItems = document.querySelectorAll(".emoji-wheel-item");
const emojiFloatingContainer = document.getElementById("emojiFloatingContainer");

// 表情轮盘状态
let emojiWheelVisible = false;
let lastMouseX = 0;
let lastMouseY = 0;
const EMOJIS = ["😀", "😂", "😍", "😭", "😡", "🎉", "👍", "❤️"];

/**
 * 显示表情轮盘
 */
function showEmojiWheel() {
    // 检查是否在输入框中
    if (document.activeElement === chatInput) {
        return;
    }
    
    emojiWheelVisible = true;
    emojiWheel.classList.remove("hidden");
    emojiWheel.style.left = (lastMouseX - 80) + "px";
    emojiWheel.style.top = (lastMouseY - 80) + "px";
    
    // 重置所有项的选中状态
    emojiWheelItems.forEach(item => item.classList.remove("selected"));
}

/**
 * 隐藏表情轮盘
 */
function hideEmojiWheel() {
    emojiWheelVisible = false;
    emojiWheel.classList.add("hidden");
    
    // 重置所有项的选中状态
    emojiWheelItems.forEach(item => item.classList.remove("selected"));
}

/**
 * 发送表情
 * @param {number} index - 表情索引 (0-7)
 */
function sendEmoji(index) {
    if (index < 0 || index >= EMOJIS.length) return;
    const emoji = EMOJIS[index];

    // 获取当前鼠标位置百分比（基于视口）
    const xPercent = (lastMouseX / window.innerWidth) * 100;
    const yPercent = (lastMouseY / window.innerHeight) * 100;

    // 发送表情消息（聊天用，不带坐标）
    if (currentRoom) {
        socket.emit("send_message", {
            room: currentRoom,
            username: currentUsername || "匿名用户",
            message: emoji,
            timestamp: Date.now() / 1000,
            type: "emoji",
        });
    }

    // 广播浮动表情事件（带坐标）
    socket.emit("send_emoji_effect", {
        room: currentRoom,
        emoji: emoji,
        xPercent: xPercent,
        yPercent: yPercent
    });
    
    // 关闭轮盘
    hideEmojiWheel();
}

/**
 * 创建表情浮动效果
 * @param {string} emoji - 表情符号
 * @param {number} x - 开始位置 X
 * @param {number} y - 开始位置 Y
 */
function createFloatingEmoji(emoji, x, y) {
    const floatingEl = document.createElement("div");
    floatingEl.className = "emoji-floating";
    floatingEl.textContent = emoji;
    floatingEl.style.left = (x - 20) + "px";
    floatingEl.style.top = (y - 20) + "px";
    
    emojiFloatingContainer.appendChild(floatingEl);
    
    // 1.5秒后移除
    setTimeout(() => {
        floatingEl.remove();
    }, 1500);
}

/**
 * 追踪鼠标位置（用于表情轮盘显示位置）
 */
document.addEventListener("mousemove", (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    // 如果轮盘已显示，不跟随鼠标（位置固定）
    // 如果需要轮盘跟随鼠标，取消下面的注释：
    // if (emojiWheelVisible) {
    //     emojiWheel.style.left = (lastMouseX - 80) + "px";
    //     emojiWheel.style.top = (lastMouseY - 80) + "px";
    // }
});

/**
 * 键盘事件监听
 */
document.addEventListener("keydown", (e) => {
    // V 键：切换表情轮盘
    if (e.key === "v" || e.key === "V") {
        // 检查是否在输入框中
        if (document.activeElement === chatInput) {
            return;
        }
        e.preventDefault();
        if (emojiWheelVisible) {
            hideEmojiWheel();
        } else {
            showEmojiWheel();
        }
        return;
    }
    
    // Esc 键：关闭轮盘
    if (e.key === "Escape") {
        if (emojiWheelVisible) {
            hideEmojiWheel();
            e.preventDefault();
        }
        return;
    }
    
    // 数字键 1-8：选择表情
    if (emojiWheelVisible && e.key >= "1" && e.key <= "8") {
        const index = parseInt(e.key) - 1;
        
        // 高亮选中的表情
        emojiWheelItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add("selected");
            } else {
                item.classList.remove("selected");
            }
        });
        
        // 延迟发送，以显示高亮效果
        setTimeout(() => {
            sendEmoji(index);
        }, 150);
        
        e.preventDefault();
    }
});

// ===================== 聊天功能 =====================

// 聊天 DOM 元素
const chatPanel = document.getElementById("chatPanel");
const chatToggleBtn = document.getElementById("chatToggleBtn");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatNotificationContainer = document.getElementById("chatNotificationContainer");
const chatEditUsernameBtn = document.getElementById("chatEditUsernameBtn");

// 聊天状态
let chatNotifications = []; // 当前显示的浮窗通知
const MAX_NOTIFICATIONS = 5;
const NOTIFICATION_DURATION = 5000; // 5秒后自动移除

/**
 * 自动调整输入框高度
 */
function autoResizeInput() {
    chatInput.style.height = "auto";
    const scrollHeight = chatInput.scrollHeight;
    chatInput.style.height = Math.min(scrollHeight, 100) + "px";
}

/**
 * 初始化聊天功能
 */
function initChat() {
    // 聊天侧边栏切换
    const chatSidebar = document.getElementById("chatSidebar");
    const chatToggleBtn = document.getElementById("chatToggleSidebarBtn");
    const chatCloseBtn = document.getElementById("chatSidebarCloseBtn");

    if (chatToggleBtn && chatSidebar) {
    chatToggleBtn.addEventListener("click", () => chatSidebar.classList.toggle("open"));
    }
    if (chatCloseBtn && chatSidebar) {
        chatCloseBtn.addEventListener("click", () => {
            chatSidebar.classList.remove("open");
        });
    }

    // 编辑用户名按钮
    const chatEditUsernameBtn = document.getElementById("chatEditUsernameBtn");
    if (chatEditUsernameBtn) {
        chatEditUsernameBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showUsernameDialog();
        });
    }

    // 绑定发送按钮 (chatSendBtn 全局已有)
    if (chatSendBtn) {
        chatSendBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sendChatMessage();
        });
    }

    // 绑定输入框 Enter 键 (chatInput 全局已有)
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        chatInput.addEventListener("input", autoResizeInput);
    }
}

/**
 * 切换聊天面板的展开/收起状态
 */
// function toggleChatPanel() {
//     chatPanel.classList.toggle("collapsed");
//     chatPanel.classList.toggle("expanded");
//
//     // 展开时自动滚到底部
//     if (chatPanel.classList.contains("expanded")) {
//         setTimeout(() => {
//             chatMessages.scrollTop = chatMessages.scrollHeight;
//         }, 100);
//     }
// }

/**
 * 发送聊天消息
 */
function sendChatMessage() {
    const message = chatInput.value.trim();
    
    if (!message || !currentRoom) {
        return;
    }
    
    socket.emit("send_message", {
        room: currentRoom,
        username: currentUsername || "匿名用户",
        message: message,
        timestamp: Date.now() / 1000,
    });
    
    // 清空输入框并重置高度
    chatInput.value = "";
    autoResizeInput();
}

/**
 * 添加聊天消息到历史面板和浮窗队列
 * @param {string} username - 用户名
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('user'、'system' 或 'emoji')
 */
function addChatMessage(username, message, type = "user") {
    // 添加到历史记录
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${type}`;
    
    if (type === "system") {
        bubble.innerHTML = `<strong>${message}</strong>`;
    } else if (type === "emoji") {
        bubble.innerHTML = `<strong>${username}</strong> 发送了表情 ${message}`;
    } else {
        bubble.innerHTML = `<strong>${username}</strong><br>${escapeHtml(message)}`;
    }
    
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 添加到浮窗队列（表情消息特殊处理）
    if (type === "emoji") {
        addNotification(username, `发送了表情 ${message}`, type);
    } else {
        addNotification(username, message, type);
    }
}

/**
 * 添加系统消息的便利函数
 * @param {string} message - 消息内容
 */
function addSystemMessage(message) {
    addChatMessage("系统", message, "system");
}

/**
 * 添加浮窗通知
 * @param {string} username - 用户名
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
function addNotification(username, message, type = "user") {
    // 如果已经有5个通知，移除最旧的
    if (chatNotifications.length >= MAX_NOTIFICATIONS) {
        const oldest = chatNotifications.shift();
        removeNotification(oldest);
    }
    
    // 创建通知元素
    const notification = document.createElement("div");
    notification.className = `chat-notification ${type}`;
    
    if (type === "system") {
        notification.innerHTML = `<strong>${message}</strong>`;
    } else {
        notification.innerHTML = `<strong>${username}</strong><br>${escapeHtml(message)}`;
    }
    
    chatNotificationContainer.appendChild(notification);
    chatNotifications.push(notification);
    
    // 5秒后自动移除
    setTimeout(() => {
        notification.classList.add("fade-out");
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            chatNotifications = chatNotifications.filter(n => n !== notification);
        }, 500);
    }, NOTIFICATION_DURATION);
}

/**
 * 移除通知
 * @param {HTMLElement} notification - 通知元素
 */
function removeNotification(notification) {
    if (notification && notification.parentNode) {
        notification.classList.add("fade-out");
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }
}

/**
 * 转义 HTML 字符以防止 XSS
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Socket.IO 聊天事件监听
socket.on("receive_message", (data) => {
    if (data?.username && data?.message) {
        addChatMessage(data.username, data.message, data.type || "user");
    }
});

socket.on("chat_history", (data) => {
    if (data?.messages && Array.isArray(data.messages)) {
        // 清空当前消息
        chatMessages.innerHTML = "";
        
        // 加载历史消息
        for (const msg of data.messages) {
            const bubble = document.createElement("div");
            bubble.className = `chat-bubble ${msg.type || "user"}`;
            
            if (msg.type === "system") {
                bubble.innerHTML = `<strong>${msg.message}</strong>`;
            } else {
                bubble.innerHTML = `<strong>${msg.username}</strong><br>${escapeHtml(msg.message)}`;
            }
            
            chatMessages.appendChild(bubble);
        }
        
        // 滚到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

/**
 * 更新用户名显示
 */
function updateUserNameDisplay() {
    document.getElementById("userNameText").textContent =
        `你的昵称：${currentUsername}`;
}

/**
 * 设置用户名
 * @param {string} newName - 新用户名
 */
function setUsername(newName) {
    if (!newName || newName.trim().length === 0) {
        alert("用户名不能为空");
        return;
    }
    currentUsername = newName.trim();
    updateUserNameDisplay();
    alert(`昵称已更改为：${currentUsername}`);
}

/**
 * 显示用户名编辑对话框
 */
function showUsernameDialog() {
    const newName = prompt("请输入新的昵称", currentUsername);
    if (newName !== null) {
        setUsername(newName);
    }
}

// 绑定用户名点击编辑
document.getElementById("userNameText").addEventListener("click", showUsernameDialog);

// 在 joinRoom 后初始化聊天
document.getElementById("joinRoomBtn").addEventListener("click", () => {
    setTimeout(() => {
        initChat();
    }, 100);
});


// 初始化悬浮窗
function initChallengeWidget() {
    if (document.getElementById("challengeWidget")) return;
    const widget = document.createElement("div");
    widget.id = "challengeWidget";
    widget.className = "challenge-widget collapsed";
    widget.innerHTML = `
        <div class="challenge-widget-header">
            <span>🎨 速写挑战</span>
            <div class="challenge-widget-controls">
                <button class="challenge-minimize">−</button>
            </div>
        </div>
        <div class="challenge-widget-body">
            <div class="challenge-topic-row">
                <div class="challenge-topic-text"></div>
                <div class="challenge-timer">—</div>
            </div>
            <div class="challenge-topic-image-container">
                <div class="challenge-topic-image"></div>
            </div>
            <div class="challenge-actions">
                <button class="challenge-manage-btn">📚 管理题目</button>
                <button class="challenge-config-btn">⚙️ 配置挑战</button>
                <button class="challenge-start-btn" style="display:none;">开始挑战</button>
                <button class="challenge-cancel-btn" style="display:none;">取消挑战</button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);
    challengeWidget = widget;
    makeDraggableAndResizable(widget);
    bindChallengeButtons();
}

function bindChallengeButtons() {
    const configBtn = challengeWidget.querySelector(".challenge-config-btn");
    const startBtn = challengeWidget.querySelector(".challenge-start-btn");
    const cancelBtn = challengeWidget.querySelector(".challenge-cancel-btn");
    const minimizeBtn = challengeWidget.querySelector(".challenge-minimize");
    const manageBtn = challengeWidget.querySelector(".challenge-manage-btn");
    if (manageBtn) {
        manageBtn.addEventListener("click", () => showCustomChallengeManager());
    }

    configBtn.addEventListener("click", () => showChallengeConfigModal());
    startBtn.addEventListener("click", () => startChallengeFromConfig());
    cancelBtn.addEventListener("click", () => cancelChallenge());
    minimizeBtn.addEventListener("click", () => {
        challengeWidget.classList.toggle("collapsed");
        minimizeBtn.textContent = challengeWidget.classList.contains("collapsed") ? "+" : "−";
    });
}
function collapseChallengeWidget() {
    // 关闭（隐藏）整个挑战悬浮窗，而不是仅仅折叠
    if (challengeWidget) {
        challengeWidget.style.display = "none";
    }
}
function toggleChallengeWidget() {
    const isCollapsed = challengeWidget.classList.contains("collapsed");
    if (isCollapsed) {
        // 展开
        challengeWidget.classList.remove("collapsed");
        if (challengeWidget.dataset.savedHeight) {
            challengeWidget.style.height = challengeWidget.dataset.savedHeight;
        } else {
            challengeWidget.style.height = "auto";
        }
    } else {
        // 折叠：保存当前高度，清空内联高度使外框自动适应内容高度
        challengeWidget.dataset.savedHeight = challengeWidget.style.height || challengeWidget.offsetHeight + "px";
        challengeWidget.style.height = "auto";
        challengeWidget.classList.add("collapsed");
    }
    const minBtn = challengeWidget.querySelector(".challenge-minimize");
    if (minBtn) minBtn.textContent = isCollapsed ? "−" : "+";
}

function openChallengeSetup() {
    // 弹出一个模态框，让用户设置时间和选择题库
    // 为了简化，先使用 prompt 和确认框，后续可升级为自定义模态框
    const durationSec = prompt("挑战时长（秒）:", "180");
    if (!durationSec) return;
    const usePreset = confirm("是否包含预设题目？");
    const useCustom = confirm("是否包含自定义题目？");
    // 如果需要选择具体预设类别，可再弹窗多选框
    socket.emit("start_challenge", {
        room: currentRoom,
        duration: parseInt(durationSec),
        use_preset: usePreset,
        use_custom: useCustom,
        selected_preset_ids: []  // 全选
    });
}

// 打开自定义题目管理界面
function showCustomChallengeManager() {
    // 确保有 currentRoom
    if (!currentRoom) {
        console.warn("未加入房间，无法管理题目");
        return;
    }

    // 移除已存在的模态框，避免重复
    const existingModal = document.getElementById("challengeManagerModal");
    if (existingModal) existingModal.remove();

    // 创建模态框（复用 .challenge-config-modal 样式）
    const modal = document.createElement("div");
    modal.id = "challengeManagerModal";
    modal.className = "challenge-config-modal";  // 与配置挑战相同
    modal.style.display = "flex";
    modal.innerHTML = `
        <div class="config-modal-content">
            <div class="config-header">
                <h3>📋 管理自定义题目</h3>
                <button class="config-close">✕</button>
            </div>
            <div class="config-body">
                <div class="config-field">
                    <label>➕ 添加新题目</label>
                    <textarea id="newCustomText" placeholder="输入题目文字..." style="width:100%; min-height:60px; margin-bottom:8px;"></textarea>
                    <label class="challenge-add-image-label" style="display:block; margin-bottom:4px;">
                        📷 上传参考图（可选）
                        <input type="file" id="newCustomImage" accept="image/jpeg,image/png,image/gif">
                    </label>
                    <button id="addCustomBtn" style="margin-top:8px;">➕ 添加</button>
                </div>
                <div class="config-field">
                    <label>📚 已有题目（点击删除）</label>
                    <div id="customListContainer" style="max-height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:8px; padding:8px;">
                        加载中...
                    </div>
                </div>
            </div>
            <div class="config-footer">
                <button id="closeManagerBtn">关闭</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 关闭模态框
    const closeModal = () => modal.remove();
    modal.querySelector(".config-close").addEventListener("click", closeModal);
    modal.querySelector("#closeManagerBtn").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // 刷新列表函数
    const refreshList = () => {
        const container = modal.querySelector("#customListContainer");
        if (!customChallenges.length) {
            container.innerHTML = '<div style="color:var(--muted); text-align:center;">暂无自定义题目，点击上方添加</div>';
            return;
        }
        let html = "";
        for (const chal of customChallenges) {
            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px; border-bottom:1px solid var(--border);">
                    <div style="flex:1;">
                        <div><strong>${escapeHtml(chal.text)}</strong></div>
                        ${chal.image_data ? `<img src="${chal.image_data}" style="max-width:60px; max-height:60px; margin-top:4px;">` : ""}
                        <div style="font-size:11px; color:var(--muted);">添加者：${escapeHtml(chal.created_by || "匿名")}</div>
                    </div>
                    <button class="delete-custom-btn" data-id="${chal.id}" style="background:#db5748; padding:4px 8px;">删除</button>
                </div>
            `;
        }
        container.innerHTML = html;
        // 绑定删除按钮事件
        container.querySelectorAll(".delete-custom-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = btn.getAttribute("data-id");
                if (confirm("确认删除此题吗？")) {
                    socket.emit("remove_custom_challenge", { room: currentRoom, id: id });
                }
            });
        });
    };

    // 添加题目逻辑
    const addBtn = modal.querySelector("#addCustomBtn");
    const textarea = modal.querySelector("#newCustomText");
    const fileInput = modal.querySelector("#newCustomImage");
    addBtn.addEventListener("click", () => {
        const text = textarea.value.trim();
        if (!text) {
            alert("请输入题目文字");
            return;
        }
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.emit("add_custom_challenge", {
                    room: currentRoom,
                    text: text,
                    image_data: e.target.result
                });
                textarea.value = "";
                fileInput.value = "";
                showToast("题目添加中...");
            };
            reader.readAsDataURL(file);
        } else {
            socket.emit("add_custom_challenge", {
                room: currentRoom,
                text: text,
                image_data: null
            });
            textarea.value = "";
            showToast("题目添加中...");
        }
    });

    // 监听列表更新
    const updateHandler = (data) => {
        customChallenges = data.list || [];
        refreshList();
    };
    socket.on("custom_challenges_list", updateHandler);
    // 请求最新列表
    socket.emit("get_custom_challenges", { room: currentRoom });
    refreshList();

    // 模态框移除时解除监听
    modal.addEventListener("remove", () => {
        socket.off("custom_challenges_list", updateHandler);
    });
}

// 刷新管理界面中的题目列表
function refreshChallengeManagerUI() {
    const modal = window.challengeManagerModal;
    if (!modal) return;
    const listContainer = modal.querySelector(".challenge-list");
    if (!listContainer) return;

    if (!customChallenges.length) {
        listContainer.innerHTML = '<div class="challenge-empty">暂无自定义题目，点击上方添加</div>';
        return;
    }

    listContainer.innerHTML = "";
    for (const chal of customChallenges) {
        const item = document.createElement("div");
        item.className = "challenge-list-item";
        item.innerHTML = `
            <div class="challenge-item-text">${escapeHtml(chal.text)}</div>
            ${chal.image_data ? `<img src="${chal.image_data}" class="challenge-item-preview" style="max-width:60px;max-height:60px;">` : ""}
            <div class="challenge-item-meta">添加者：${escapeHtml(chal.created_by || "匿名")}</div>
            <button class="challenge-item-delete" data-id="${chal.id}">删除</button>
        `;
        listContainer.appendChild(item);
    }

    // 绑定删除按钮
    document.querySelectorAll(".challenge-item-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            if (confirm("确认删除此题吗？")) {
                socket.emit("remove_custom_challenge", { room: currentRoom, id: id });
            }
        });
    });
}

function makeDraggableAndResizable(element) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    const header = element.querySelector(".challenge-widget-header");
    if (!header) return;
    header.setAttribute("draggable", "false");

    // 确保初始定位
    const rect = element.getBoundingClientRect();
    element.style.position = "fixed";
    element.style.left = rect.left + "px";
    element.style.top = rect.top + "px";
    element.style.right = "auto";
    element.style.bottom = "auto";

    const onMouseDown = (e) => {
        if (e.target.closest(".challenge-widget-controls")) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseFloat(element.style.left);
        startTop = parseFloat(element.style.top);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
    };
    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        newLeft = Math.min(window.innerWidth - element.offsetWidth, Math.max(0, newLeft));
        newTop = Math.min(window.innerHeight - element.offsetHeight, Math.max(0, newTop));
        element.style.left = newLeft + "px";
        element.style.top = newTop + "px";
    };
    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }
    };
    header.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    // 阻止原生拖拽
    header.addEventListener("dragstart", (e) => { e.preventDefault(); });
    header.addEventListener("selectstart", (e) => { e.preventDefault(); });

    // 调整大小手柄
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "challenge-resize-handle";
    resizeHandle.innerHTML = "↘";
    element.appendChild(resizeHandle);
    let isResizing = false;
    let resizeStartX = 0, resizeStartY = 0, startW = 0, startH = 0;
    resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        startW = element.offsetWidth;
        startH = element.offsetHeight;
    });
    window.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        const newW = startW + (e.clientX - resizeStartX);
        const newH = startH + (e.clientY - resizeStartY);
        element.style.width = Math.max(220, newW) + "px";
        element.style.height = Math.max(150, newH) + "px";
    });
    window.addEventListener("mouseup", () => { isResizing = false; });
}

function startChallengeFromConfig() {
    // 直接打开配置模态框
    showChallengeConfigModal();
}
function startChallengeTimer() {
    if (challengeTimerInterval) clearInterval(challengeTimerInterval);
    const updateTimer = () => {
        if (!isChallengeActive) return;
        const now = Date.now();
        const remaining = Math.max(0, challengeEndsAt - now);
        const seconds = Math.ceil(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timerDiv = challengeWidget?.querySelector(".challenge-timer");
        if (timerDiv) timerDiv.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        if (remaining <= 0) {
            clearInterval(challengeTimerInterval);
        }
    };
    updateTimer(); // 立即更新一次
    challengeTimerInterval = setInterval(updateTimer, 1000);
}

function cancelChallenge() {
    if (!isChallengeActive) return;
    socket.emit("cancel_challenge", { room: currentRoom });
}

function initImageViewer(imgElement) {
    console.log("initImageViewer called")
    let scale = 1;
    let translateX = 0, translateY = 0;
    let isDragging = false;
    let startX, startY, startTranslateX, startTranslateY;

    const updateTransform = () => {
        imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    };

    // 滚轮缩放
    imgElement.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.min(3, Math.max(0.5, scale + delta));
        updateTransform();
    });

    // 鼠标拖拽平移
    imgElement.addEventListener("mousedown", (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        imgElement.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        updateTransform();
    });
    window.addEventListener("mouseup", () => {
        isDragging = false;
        imgElement.style.cursor = "zoom-in";
    });
    imgElement.addEventListener("dragstart", (e) => e.preventDefault());
}

// Socket 事件
socket.on("challenge_start", (data) => {
    isChallengeActive = true;
    currentChallengeTopic = data.topic;
    currentChallengeImage = data.image_data;
    challengeEndsAt = data.ends_at * 1000;

    if (!challengeWidget) initChallengeWidget();

    // 获取元素
    const topicDiv = challengeWidget.querySelector(".challenge-topic-text");
    const imageContainer = challengeWidget.querySelector(".challenge-topic-image"); // 这是存放图片的容器
    const timerDiv = challengeWidget.querySelector(".challenge-timer");

    // 更新题目和倒计时
    topicDiv.textContent = data.topic;
    timerDiv.textContent = "—"; // 初始占位，计时器启动后会更新

    // 处理参考图
    if (currentChallengeImage) {
        imageContainer.innerHTML = "";
        const img = document.createElement("img");
        img.src = currentChallengeImage;
        img.className = "challenge-topic-image";
        img.draggable = false;
        img.onerror = () => {
            console.warn("图片加载失败:", currentChallengeImage);
            imageContainer.innerHTML = '<div style="color:red;">图片加载失败</div>';
        };
        imageContainer.appendChild(img);
        initImageViewer(img);
    } else {
        imageContainer.innerHTML = "";
    }

    // 启动计时器
    startChallengeTimer();

    // 切换按钮状态
    const configBtn = challengeWidget.querySelector(".challenge-config-btn");
    const startBtn = challengeWidget.querySelector(".challenge-start-btn");
    const cancelBtn = challengeWidget.querySelector(".challenge-cancel-btn");
    if (configBtn) configBtn.style.display = "none";
    if (startBtn) startBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "block";

    challengeWidget.classList.remove("collapsed");
    showToast(`速写挑战开始！题目：${data.topic}`);
});

socket.on("challenge_end", (data) => {
    isChallengeActive = false;
    if (challengeTimerInterval) clearInterval(challengeTimerInterval);
    if (challengeWidget) {
        challengeWidget.querySelector(".challenge-timer").textContent = "时间到！";
        challengeWidget.querySelector(".challenge-config-btn").style.display = "block";
        challengeWidget.querySelector(".challenge-cancel-btn").style.display = "none";
    }
    showToast("速写挑战结束，看看大家的作品吧~");
});


socket.on("custom_challenges_list", (data) => {
    customChallenges = data.list || [];
    // 如果配置模态框打开，可以刷新数量，但模态框内我们已用临时监听，所以这里只更新全局变量
});


// 打开自定义题目管理界面
// 配置模态框（可勾选预设分类 + 自定义题目开关 + 时长）
function showChallengeConfigModal() {
    socket.emit("get_custom_challenges", { room: currentRoom });

    let modal = document.getElementById("challengeConfigModal");
    if (modal) modal.remove();
    modal = document.createElement("div");
    modal.id = "challengeConfigModal";
    modal.className = "challenge-config-modal";
    modal.innerHTML = `
        <div class="config-modal-content">
            <div class="config-header">
                <h3>速写挑战设置</h3>
                <button class="config-close">✕</button>
            </div>
            <div class="config-body">
                <div class="config-field">
                    <label>⏱️ 挑战时长（秒）</label>
                    <input type="number" id="challengeDuration" min="30" max="600" value="180" step="10">
                </div>
                <div class="config-field">
                    <label>📚 预设题目分类（可多选）</label>
                    <div id="presetCategoriesList" class="checkbox-group"></div>
                </div>
                <div class="config-field">
                    <label>📝 使用自定义题目</label>
                    <input type="checkbox" id="useCustomChallenges" checked>
                    <span style="margin-left:8px;">（共 <span id="customCount">0</span> 道）</span>
                </div>
            </div>
            <div class="config-footer">
                <button id="confirmStartChallenge">🚀 开始挑战</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 填充预设分类复选框
    const container = modal.querySelector("#presetCategoriesList");
    container.innerHTML = "";
    if (presetCategoryNames.length === 0) {
        container.innerHTML = '<div style="color:gray;">暂无预设分类，请将图片放入 static/image/分类名/ 下</div>';
    } else {
        presetCategoryNames.forEach(cat => {
            const label = document.createElement("label");
            label.innerHTML = `<input type="checkbox" value="${escapeHtml(cat)}" checked> ${cat}`;
            container.appendChild(label);
        });
    }

    // 更新自定义题目数量显示
    const updateCustomCount = () => {
        const span = modal.querySelector("#customCount");
        if (span) span.textContent = customChallenges.length;
    };
    updateCustomCount();

    const tempListener = (data) => {
        customChallenges = data.list || [];
        updateCustomCount();
    };
    socket.once("custom_challenges_list", tempListener);

    modal.querySelector(".config-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector("#confirmStartChallenge").addEventListener("click", () => {
        const duration = parseInt(modal.querySelector("#challengeDuration").value) || 180;
        const selectedCategories = Array.from(modal.querySelectorAll("#presetCategoriesList input:checked"))
            .map(cb => cb.value);
        const useCustom = modal.querySelector("#useCustomChallenges").checked;

        if (selectedCategories.length === 0 && !useCustom) {
            alert("请至少勾选一个预设分类或启用自定义题目");
            return;
        }
        if (selectedCategories.length === 0 && useCustom && customChallenges.length === 0) {
            alert("没有可用的自定义题目，请先添加或勾选预设分类");
            return;
        }

        socket.emit("start_challenge", {
            room: currentRoom,
            duration: duration,
            selected_categories: selectedCategories,
            use_custom: useCustom
        });
        modal.remove();
    });
}


function refreshChallengeManagerUI() {
    const modal = window.challengeManagerModal;
    if (!modal) return;
    const listContainer = modal.querySelector(".challenge-list");
    if (!listContainer) return;

    if (!customChallenges.length) {
        listContainer.innerHTML = '<div class="challenge-empty">暂无自定义题目，点击上方添加</div>';
        return;
    }

    listContainer.innerHTML = "";
    for (const chal of customChallenges) {
        const item = document.createElement("div");
        item.className = "challenge-list-item";
        item.innerHTML = `
            <div class="challenge-item-text">${escapeHtml(chal.text)}</div>
            ${chal.image_data ? `<img src="${chal.image_data}" class="challenge-item-preview" style="max-width:60px;max-height:60px;">` : ""}
            <div class="challenge-item-meta">添加者：${escapeHtml(chal.created_by || "匿名")}</div>
            <button class="challenge-item-delete" data-id="${chal.id}">删除</button>
        `;
        listContainer.appendChild(item);
    }

    // 绑定删除按钮
    document.querySelectorAll(".challenge-item-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            if (confirm("确认删除此题吗？")) {
                socket.emit("remove_custom_challenge", { room: currentRoom, id: id });
            }
        });
    });
}


socket.on("show_emoji_effect", (data) => {
    const emoji = data.emoji;
    const xPercent = data.xPercent;
    const yPercent = data.yPercent;

    // 将百分比转换为实际像素位置
    const x = (xPercent / 100) * window.innerWidth;
    const y = (yPercent / 100) * window.innerHeight;

    createFloatingEmoji(emoji, x, y);
});
function saveSnapshotToServer() {
    if (!currentRoom) return;
    // 收集所有图层数据
    const layersData = layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        blend: layer.blend,
        opacity: layer.opacity,
        imageData: layer.canvas.toDataURL()  // 转为 base64
    }));
    socket.emit("save_snapshot", {
        room: currentRoom,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        activeLayerId: activeLayerId,
        layers: layersData
    });
}
socket.on("load_snapshot", (snapshot) => {
    canvasWidth = snapshot.canvasWidth;
    canvasHeight = snapshot.canvasHeight;
    // 清除现有图层
    layers = [];
    layerStack.innerHTML = "";
    // 重建图层
    snapshot.layers.forEach(layerData => {
        const layer = createLayer(layerData.name, layerData.id);
        layer.visible = layerData.visible;
        layer.locked = layerData.locked;
        layer.blend = layerData.blend;
        layer.opacity = layerData.opacity;
        // 加载图片
        const img = new Image();
        img.onload = () => {
            layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            layer.ctx.drawImage(img, 0, 0);
        };
        img.src = layerData.imageData;
        layers.push(layer);
    });
    activeLayerId = snapshot.activeLayerId;
    syncLayerDomOrder();
    updateLayerList();
    setZoom(zoomPercent);
});

let autoSaveTimer = null;

function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
        if (currentRoom && layers.length > 0) {
            saveSnapshotToServer();
            console.log("自动保存快照");
        }
    }, 60000); // 60秒
}

function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}

// 页面关闭前保存最后一次
window.addEventListener("beforeunload", () => {
    if (currentRoom) {
        saveSnapshotToServer();
    }
    stopAutoSave();
});
document.getElementById("exportSnapshotBtn")?.addEventListener("click", () => {
    if (!currentRoom) return;
    saveSnapshotToServer(); // 先保存到服务器，或者直接收集当前数据
    const layersData = layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        blend: layer.blend,
        opacity: layer.opacity,
        imageData: layer.canvas.toDataURL()
    }));
    const snapshot = {
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        activeLayerId: activeLayerId,
        layers: layersData,
        exportTime: Date.now()
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapshot_${currentRoom}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});
// ==================== 手动导入快照 ====================
const importBtn = document.getElementById("importSnapshotBtn");
const fileInput = document.getElementById("snapshotFileInput");

if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => {
        fileInput.click();
    });
    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const snapshot = JSON.parse(e.target.result);
                // 校验必要字段
                if (!snapshot.layers || !Array.isArray(snapshot.layers)) {
                    alert("无效的快照文件：缺少 layers 字段");
                    return;
                }
                // 重建画布
                restoreFromSnapshot(snapshot);
                // 可选：立即保存到服务器，覆盖自动保存文件
                setTimeout(() => saveSnapshotToServer(), 500);
                showToast("导入成功！");
            } catch (err) {
                console.error("导入失败", err);
                alert("解析快照文件失败");
            } finally {
                fileInput.value = ""; // 清空，允许重复导入同一文件
            }
        };
        reader.readAsText(file);
    });
}

function restoreFromSnapshot(snapshot) {
    // 更新画布尺寸
    canvasWidth = snapshot.canvasWidth || 800;
    canvasHeight = snapshot.canvasHeight || 600;
    canvasWidthInput.value = canvasWidth;
    canvasHeightInput.value = canvasHeight;

    // 清除现有图层
    layers = [];
    layerStack.innerHTML = "";

    // 重建图层
    const loadPromises = snapshot.layers.map(layerData => {
        return new Promise((resolve) => {
            const layer = createLayer(layerData.name || `图层 ${layerData.id}`, layerData.id);
            layer.visible = layerData.visible !== false;
            layer.locked = !!layerData.locked;
            layer.blend = layerData.blend || "normal";
            layer.opacity = layerData.opacity ?? 1;

            const img = new Image();
            img.onload = () => {
                layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                layer.ctx.drawImage(img, 0, 0);
                layers.push(layer);
                resolve();
            };
            img.onerror = () => {
                console.warn("图层图片加载失败", layerData.imageData?.slice(0, 50));
                layers.push(layer);
                resolve();
            };
            img.src = layerData.imageData;
        });
    });

    Promise.all(loadPromises).then(() => {
        activeLayerId = snapshot.activeLayerId;
        // 如果 activeLayerId 无效，选中第一个图层
        if (!layers.some(l => l.id === activeLayerId) && layers[0]) {
            activeLayerId = layers[0].id;
        }
        syncLayerDomOrder();
        updateLayerList();
        setZoom(zoomPercent);
        // 如果需要，可在此处触发重绘
    });
}
