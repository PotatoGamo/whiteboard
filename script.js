// get our canvas element
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const colorPicker = document.getElementById("color-picker");
const penSizeSlider = document.getElementById("pen-size");
const penSizePreview = document.getElementById("pen-size-preview");
// line width variable
let lineWidth = getPenSize();

let drawings = loadDrawings();


// coordinates of our cursor
let cursorX;
let cursorY;
let prevCursorX;
let prevCursorY;

// distance from origin
let offsetX = 0;
let offsetY = 0;

// zoom amount
let scale = 1;

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

// Load saved configurations
colorPicker.value = loadColorPicker();
colorPicker.style.backgroundColor = colorPicker.value;
penSizeSlider.value = loadPenSize();
penSizePreview.style.backgroundColor = colorPicker.value;

redrawCanvas();


// Initialize line width
lineWidth = getPenSize();
penSizePreview.style.width = lineWidth + "px";
penSizePreview.style.height = lineWidth + "px";

// Disable right-clicking
document.oncontextmenu = function () {
    return false;
};

// Event listeners
colorPicker.addEventListener('change', () => {
    saveColorPicker(colorPicker.value);
    colorPicker.style.backgroundColor = colorPicker.value;
});

penSizeSlider.oninput = updatePenSize;

window.addEventListener("resize", redrawCanvas);
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('wheel', onMouseWheel);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('touchstart', onTouchStart);
canvas.addEventListener('touchend', onTouchEnd);
canvas.addEventListener('touchmove', onTouchMove);
document.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace') {
        wipe()
    }
    if (event.key === 's') {
        save()
    }
});

function save() {
    let canvasUrl = canvas.toDataURL("image/png", 1);
    console.log(canvasUrl);
    const createEl = document.createElement('a');
    createEl.href = canvasUrl;
    createEl.download = "whiteboard";
    createEl.click();
    createEl.remove();
}
// Other functions remain unchanged...
function wipe(){
    drawings.length = 0;
    saveDrawings();
    redrawCanvas();
}

function getPenSize() {
    return Math.floor((1.0483 ** penSizeSlider.value) - 2);
}

function getBG() {
    return getComputedStyle(document.body).getPropertyValue('--bg');
}

function eraserOveride() {
    colorPicker.style.backgroundColor = "#ffffff";
    colorPicker.style.background = "linear-gradient(45deg, rgba(255,255,255,1) 45%, rgba(255,0,0,1) 45%, rgba(255,0,0,1) 55%, rgba(255,255,255,1) 55%)";
}

// Convert coordinates
function toScreenX(xTrue) {
    return (xTrue + offsetX) * scale;
}

function toScreenY(yTrue) {
    return (yTrue + offsetY) * scale;
}

function toTrueX(xScreen) {
    return (xScreen / scale) - offsetX;
}

function toTrueY(yScreen) {
    return (yScreen / scale) - offsetY;
}

function trueHeight() {
    return canvas.clientHeight / scale;
}

function trueWidth() {
    return canvas.clientWidth / scale;
}

function setPenColor(hex) {
    saveColorPicker(hex);
    penSizePreview.style.background = hex;
    colorPicker.value = hex;
    colorPicker.style.background = colorPicker.value;
}

function redrawCanvas() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    context.fillStyle = getBG();
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < drawings.length; i++) {
        const line = drawings[i];
        drawLine(toScreenX(line.x0), toScreenY(line.y0), toScreenX(line.x1), toScreenY(line.y1), line.color, line.width * scale);
    }
}

function saveDrawings() {
    localStorage.setItem('drawings', JSON.stringify(drawings));
}

function loadDrawings() {
    const storedDrawings = localStorage.getItem('drawings');
    return storedDrawings ? JSON.parse(storedDrawings) : [];
}

function loadColorPicker() {
    const storedColor = localStorage.getItem('color-picker');
    return storedColor || "#000000";
}

function loadPenSize() {
    const storedPenSize = localStorage.getItem('pen-size');
    return storedPenSize || penSizeSlider.value;
}

function saveColorPicker(color) {
    localStorage.setItem('color-picker', color);
}

function savePenSize() {
    localStorage.setItem('pen-size', penSizeSlider.value);
}

function updatePenSize() {
    savePenSize();
    lineWidth = getPenSize();
    penSizePreview.style.width = lineWidth + "px";
    penSizePreview.style.height = lineWidth + "px";
}

// Mouse Event Handlers
let leftMouseDown = false;
let rightMouseDown = false;

function onMouseDown(event) {
    if (event.button == 0) {
        leftMouseDown = true;
        rightMouseDown = false;
    }
    if (event.button == 2) {
        rightMouseDown = true;
        leftMouseDown = false;
    }

    cursorX = event.pageX;
    cursorY = event.pageY;
    prevCursorX = event.pageX;
    prevCursorY = event.pageY;
}

function onMouseMove(event) {
    cursorX = event.pageX;
    cursorY = event.pageY;
    const scaledX = toTrueX(cursorX);
    const scaledY = toTrueY(cursorY);
    const prevScaledX = toTrueX(prevCursorX);
    const prevScaledY = toTrueY(prevCursorY);

    if (leftMouseDown) {
        drawings.push({
            x0: prevScaledX,
            y0: prevScaledY,
            x1: scaledX,
            y1: scaledY,
            color: colorPicker.value,
            width: lineWidth
        });
        saveDrawings();
        drawLine(prevCursorX, prevCursorY, cursorX, cursorY, colorPicker.value, lineWidth);
    } else if (rightMouseDown) {
        offsetX += (cursorX - prevCursorX) / scale;
        offsetY += (cursorY - prevCursorY) / scale;
        redrawCanvas();
    }

    prevCursorX = cursorX;
    prevCursorY = cursorY;
}

function onMouseUp(event) {
    leftMouseDown = false;
    rightMouseDown = false;
}

const prevTouches = [null, null]; // up to 2 touches
let singleTouch = false;
let doubleTouch = false;
function onTouchStart(event) {
    if (event.touches.length == 1) {
        singleTouch = true;
        doubleTouch = false;
    }
    if (event.touches.length >= 2) {
        singleTouch = false;
        doubleTouch = true;
    }

    // store the last touches
    prevTouches[0] = event.touches[0];
    prevTouches[1] = event.touches[1];

}

function onTouchMove(event) {
    // get first touch coordinates
    const touch0X = event.touches[0].pageX;
    const touch0Y = event.touches[0].pageY;
    const prevTouch0X = prevTouches[0].pageX;
    const prevTouch0Y = prevTouches[0].pageY;

    const scaledX = toTrueX(touch0X);
    const scaledY = toTrueY(touch0Y);
    const prevScaledX = toTrueX(prevTouch0X);
    const prevScaledY = toTrueY(prevTouch0Y);

    if (singleTouch) {
        // add to history
        drawings.push({
            x0: prevScaledX,
            y0: prevScaledY,
            x1: scaledX,
            y1: scaledY,
            color:colorPicker.value,
            width:lineWidth
        })
        saveDrawings()
        drawLine(prevTouch0X, prevTouch0Y, touch0X, touch0Y, colorPicker.value, lineWidth*scale);
    }

    if (doubleTouch) {
        // get second touch coordinates
        const touch1X = event.touches[1].pageX;
        const touch1Y = event.touches[1].pageY;
        const prevTouch1X = prevTouches[1].pageX;
        const prevTouch1Y = prevTouches[1].pageY;

        // get midpoints
        const midX = (touch0X + touch1X) / 2;
        const midY = (touch0Y + touch1Y) / 2;
        const prevMidX = (prevTouch0X + prevTouch1X) / 2;
        const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;

        // calculate the distances between the touches
        const hypot = Math.sqrt(Math.pow((touch0X - touch1X), 2) + Math.pow((touch0Y - touch1Y), 2));
        const prevHypot = Math.sqrt(Math.pow((prevTouch0X - prevTouch1X), 2) + Math.pow((prevTouch0Y - prevTouch1Y), 2));

        // calculate the screen scale change
        var zoomAmount = hypot / prevHypot;
        scale = scale * zoomAmount;
        const scaleAmount = 1 - zoomAmount;

        // calculate how many pixels the midpoints have moved in the x and y direction
        const panX = midX - prevMidX;
        const panY = midY - prevMidY;
        // scale this movement based on the zoom level
        offsetX += (panX / scale);
        offsetY += (panY / scale);

        // Get the relative position of the middle of the zoom.
        // 0, 0 would be top left. 
        // 0, 1 would be top right etc.
        var zoomRatioX = midX / canvas.clientWidth;
        var zoomRatioY = midY / canvas.clientHeight;

        // calculate the amounts zoomed from each edge of the screen
        const unitsZoomedX = trueWidth() * scaleAmount;
        const unitsZoomedY = trueHeight() * scaleAmount;

        const unitsAddLeft = unitsZoomedX * zoomRatioX;
        const unitsAddTop = unitsZoomedY * zoomRatioY;

        offsetX += unitsAddLeft;
        offsetY += unitsAddTop;

        redrawCanvas();
    }
    prevTouches[0] = event.touches[0];
    prevTouches[1] = event.touches[1];
}

function onTouchEnd(event) {
    leftMouseDown = false;
    rightMouseDown = false;
}

// Drawing function that uses color and width
function drawLine(x0, y0, x1, y1, color, width) {
    if (x0&&y0&&x1&&y1&&color&&width) {
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
    }else{
        alert("missing parameters")
    }
}

// Handles zooming with the mouse wheel
function onMouseWheel(event) {
    const deltaY = event.deltaY;
    const scaleAmount = -deltaY / 500;
    scale = scale * (1 + scaleAmount);

    // zoom the page based on where the cursor is
    var distX = event.pageX / canvas.clientWidth;
    var distY = event.pageY / canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = trueWidth() * scaleAmount;
    const unitsZoomedY = trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    offsetX -= unitsAddLeft;
    offsetY -= unitsAddTop;

    redrawCanvas();
}

dragElement(document.getElementById("tool-box"));

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
