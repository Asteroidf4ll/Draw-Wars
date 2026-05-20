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

let canvasWidth = 800;
let canvasHeight = 600;
let zoomPercent = 100;

let layers = [];
let activeLayerId = null;
let layerIdSeq = 1;

let isDrawing = false;
let hasDrawnOnCurrentStroke = false;
let lastX = 0;
let lastY = 0;
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
}

function swapSlots() {
    const temp = colorState.primaryHex;
    colorState.primaryHex = colorState.secondaryHex;
    colorState.secondaryHex = temp;
    loadActiveSlotToControls();
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

                layer.blend = mode.value;

                layer.canvas.style.mixBlendMode = layer.blend;

                updateLayerList();

                pushHistory();
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
    const layer = createLayer(`图层 ${layers.length + 1}`);
    layers.push(layer);
    activeLayerId = layer.id;
    syncLayerDomOrder();
    updateLayerList();
    pushHistory();
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

function getCanvasPos(event) {
    const rect = canvasStage.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvasWidth / rect.width),
        y: (event.clientY - rect.top) * (canvasHeight / rect.height)
    };
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
    const px = Math.max(1, toolState.size * scale);
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

    const pos = getCanvasPos(event);

    lastX = pos.x;
    lastY = pos.y;
}
function draw(event) {

    if (!isDrawing) return;

    const layer = getActiveLayer();

    if (!layer) return;

    const pos = getCanvasPos(event);

    const ctx = layer.ctx;

    const dx = pos.x - lastX;
    const dy = pos.y - lastY;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    const spacing =
        Math.max(1, toolState.size * 0.12);

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
                toolState.size / 2;

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
                    currentBrushColor(),
                    flow
                )
            );

            gradient.addColorStop(
                1,
                hexToRgba(
                    currentBrushColor(),
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
                toolState.size;

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
                currentBrushColor();

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                toolState.size;

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
                currentBrushColor();

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                toolState.size *
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
                currentBrushColor();

            ctx.globalAlpha =
                (toolState.opacity || 1) * 0.18;

            ctx.lineWidth =
                toolState.size;

            ctx.lineCap = "square";
        }

        // =========================
        // 默认笔刷
        // =========================

        else {

            ctx.globalCompositeOperation =
                "source-over";

            ctx.strokeStyle =
                currentBrushColor();

            ctx.globalAlpha =
                toolState.opacity || 1;

            ctx.lineWidth =
                toolState.size;
        }

        // 统一 stroke
        ctx.stroke();
        socket.emit("draw", {

        room: currentRoom,

        x1: lastX,
        y1: lastY,

        x2: pos.x,
        y2: pos.y,

        color: currentBrushColor(),

        size: toolState.size,

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

    hasDrawnOnCurrentStroke = true;
}
function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (hasDrawnOnCurrentStroke && toolState.mode === "brush") {
        pushHistoryColor(currentBrushColor());
    }
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
            room: currentRoom
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
}

function selectTool(mode, presetId, size) {

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

function undo() {
    if (undoStack.length <= 1 || isRestoring) return;
    const current = undoStack.pop();
    redoStack.push(current);
    restoreFromState(undoStack[undoStack.length - 1]);
}

function redo() {
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

    for (const layer of layers) {
        const temp = document.createElement("canvas");
        temp.width = oldW;
        temp.height = oldH;
        temp.getContext("2d").drawImage(layer.canvas, 0, 0);
        layer.canvas.width = nextW;
        layer.canvas.height = nextH;
        layer.ctx.clearRect(0, 0, nextW, nextH);
        layer.ctx.drawImage(temp, 0, 0);
    }

    canvasWidth = nextW;
    canvasHeight = nextH;
    canvasWidthInput.value = String(nextW);
    canvasHeightInput.value = String(nextH);
    setZoom(zoomPercent);
    pushHistory();
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
});

eraserPanelBtn.addEventListener("click", () => {
    const wasEraser = toolState.mode === "eraser";
    toolState.mode = "eraser";
    if (wasEraser) togglePanel("eraser");
    else closePanels();
    setPanMode(false);
    updateCursorStyle();
});

panToolBtn.addEventListener("click", () => setPanMode(!isPanMode));

sizeSlider.addEventListener("input", () => {
    sizeInput.value = sizeSlider.value;
    setToolSize(sizeSlider.value);
});

sizeInput.addEventListener("input", () => {
    const value = clamp(Number(sizeInput.value) || 1, 1, 500);
    setToolSize(value);
});
opacitySlider.addEventListener("input", () => {

    const value =
        clamp(Number(opacitySlider.value), 1, 100);

    toolState.opacity = value / 100;

    updateOpacityControls();
});

opacityInput.addEventListener("input", () => {

    const value =
        clamp(Number(opacityInput.value), 1, 100);

    toolState.opacity = value / 100;

    updateOpacityControls();
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
});
window.addEventListener("keydown", (event) => {

    if (event.key === "[") {
        setToolSize(toolState.size - 2);
    }

    if (event.key === "]") {
        setToolSize(toolState.size + 2);
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



// ========================
// 多人协作
// ========================

const socket = io();

let currentRoom = null;

const username =
    "画师_" +
    Math.floor(Math.random() * 1000);

document.getElementById(
    "userNameText"
).textContent =
    `你的昵称：${username}`;


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

        socket.emit(
            "join_room",
            {
                room,
                username
            }
        );

        roomOverlay.style.display =
            "none";
    }
);
function broadcastDraw(data) {

    if (!currentRoom) return;

    socket.emit(
        "draw",
        {
            room: currentRoom,
            operation: data
        }
    );
}

socket.on(
    "draw",
    (data) => {

        const layer =
            getActiveLayer();

        if (!layer) return;

        const ctx = layer.ctx;

        ctx.lineCap = "round";

        ctx.lineJoin = "round";

        if (data.mode === "eraser") {

            ctx.globalCompositeOperation =
                "destination-out";

            ctx.strokeStyle =
                "rgba(0,0,0,1)";

        } else {

            ctx.globalCompositeOperation =
                "source-over";

            ctx.strokeStyle =
                data.color;
        }

        ctx.globalAlpha =
            data.opacity;

        ctx.lineWidth =
            data.size;

        ctx.beginPath();

        ctx.moveTo(
            data.x1,
            data.y1
        );

        ctx.lineTo(
            data.x2,
            data.y2
        );

        ctx.stroke();

        ctx.globalAlpha = 1;
    }
);
socket.on(
    "clear",
    () => {

        const layer =
            getActiveLayer();

        if (!layer) return;

        layer.ctx.clearRect(
            0,
            0,
            canvasWidth,
            canvasHeight
        );
    }
);

socket.on(
    "clear",
    () => {

        const layer =
            getActiveLayer();

        if (!layer) return;

        layer.ctx.clearRect(
            0,
            0,
            canvasWidth,
            canvasHeight
        );
    }
);

socket.on(
    "undo",
    () => {

        undo();
    }
);

socket.on(
    "sync_history",
    (data) => {

        for (
            const op
            of data.operations
        ) {

            if (
                op.type === "stroke"
            ) {

                const layer =
                    getActiveLayer();

                const ctx =
                    layer.ctx;

                ctx.lineCap =
                    "round";

                ctx.lineJoin =
                    "round";

                ctx.strokeStyle =
                    op.color;

                ctx.lineWidth =
                    op.size;

                ctx.globalAlpha =
                    op.opacity;

                ctx.beginPath();

                ctx.moveTo(
                    op.x1,
                    op.y1
                );

                ctx.lineTo(
                    op.x2,
                    op.y2
                );

                ctx.stroke();

                ctx.globalAlpha = 1;
            }

            if (
                op.type === "clear"
            ) {

                const layer =
                    getActiveLayer();

                layer.ctx.clearRect(
                    0,
                    0,
                    canvasWidth,
                    canvasHeight
                );
            }
        }
    }
);


socket.on("connect", ()=>{

    console.log("socket connected");

});