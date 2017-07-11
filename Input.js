let dragging = false;
let dragStart = {x: 0, y: 0};
let viewStart = {x: 0, y: 0};

let btnZoomIn = document.getElementById("zoomIn");
let btnZoomOut = document.getElementById("zoomOut");
btnZoomIn.addEventListener("touchstart", function(event){
	eWheel(-3);
	event.preventDefault();
}, false);
btnZoomOut.addEventListener("touchstart", function(event){
	eWheel(3);
	event.preventDefault();
}, false);
function enableZoomBtns() {
	btnZoomOut.style.visibility = btnZoomIn.style.visibility = "visible";
}

document.addEventListener("keydown", function(event){
	if (event.keyCode === 88) //X
		stopRendering();
}, false);

//event listeners
canvas.addEventListener("mousedown",function(event){
	eDragStart(event.layerX, event.layerY)
},false);
document.addEventListener("mouseup",function(event){
	eDragEnd()
},false);
document.addEventListener("mousemove", function(event){
	eDrag(
		event.pageX - canvas.offsetLeft,
		event.pageY - canvas.offsetTop
	);
},false);
canvas.addEventListener("touchstart",function(event){
	enableZoomBtns();
	if (event.targetTouches.length === 1) {
		eDragStart(
			event.targetTouches[0].pageX - canvas.offsetLeft,
			event.targetTouches[0].pageY - canvas.offsetTop
		);
		event.preventDefault();
	}
},false);
canvas.addEventListener("touchend",function(event){
	eDragEnd();
	event.preventDefault();
},false);
canvas.addEventListener("touchmove", function(event){
	eDrag(
		event.targetTouches[0].pageX - canvas.offsetLeft,
		event.targetTouches[0].pageY - canvas.offsetTop
	);
	event.preventDefault();
},false);
canvas.addEventListener("wheel", function(event){
	const normalized = normalizeWheel(event);
	eWheel(normalized.spinY);
	event.preventDefault();
},false);

function eDragStart(x,y) {
	dragging = true;
	dragStart.x = x;
	dragStart.y = y;
	viewStart.x = view.x;
	viewStart.y = view.y;
}
function eDragEnd() {
	dragging = false;
	refresh();
}
function eDrag(x,y) {
	if (dragging) {
		view.x = viewStart.x + (x - dragStart.x)*view.currentScale;
		view.y = viewStart.y + (y - dragStart.y)*view.currentScale;
		refresh();
	}
}
function eWheel(deltaY) {
	if (deltaY < 0) {
		view.scale /= ZOOM_RATE ** Math.abs(deltaY);
		refresh();
	}
	else if (deltaY > 0) {
		view.scale *= ZOOM_RATE ** Math.abs(deltaY);
		refresh();
	}
}

// Reasonable defaults
var PIXEL_STEP  = 10;
var LINE_HEIGHT = 40;
var PAGE_HEIGHT = 800;

//https://stackoverflow.com/a/30134826/1175802
function normalizeWheel(/*object*/ event) /*object*/ {
	var sX = 0, sY = 0,       // spinX, spinY
	pX = 0, pY = 0;       // pixelX, pixelY

	// Legacy
	if ('detail'      in event) { sY = event.detail; }
	if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
	if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }
	if ('wheelDeltaX' in event) { sX = -event.wheelDeltaX / 120; }

	// side scrolling on FF with DOMMouseScroll
	if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
		sX = sY;
		sY = 0;
	}

	pX = sX * PIXEL_STEP;
	pY = sY * PIXEL_STEP;

	if ('deltaY' in event) { pY = event.deltaY; }
	if ('deltaX' in event) { pX = event.deltaX; }

	if ((pX || pY) && event.deltaMode) {
		if (event.deltaMode == 1) {          // delta in LINE units
			pX *= LINE_HEIGHT;
			pY *= LINE_HEIGHT;
		} else {                             // delta in PAGE units
			pX *= PAGE_HEIGHT;
			pY *= PAGE_HEIGHT;
		}
	}

	// Fall-back if spin cannot be determined
	if (pX && !sX) { sX = (pX < 1) ? -1 : 1; }
	if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

	return { spinX  : sX,
			 spinY  : sY,
			 pixelX : pX,
			 pixelY : pY };
}