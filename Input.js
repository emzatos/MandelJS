let dragging = false;
let dragStart = {x: 0, y: 0};
let viewStart = {x: 0, y: 0};

let btnZoomIn = document.getElementById("zoomIn");
let btnZoomOut = document.getElementById("zoomOut");
btnZoomIn.addEventListener("touchstart", function(event){
	eWheel(-400);
	event.preventDefault();
}, false);
btnZoomOut.addEventListener("touchstart", function(event){
	eWheel(400);
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
	eWheel(event.deltaY);
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
		view.scale /= Math.pow(ZOOM_RATE,Math.abs(deltaY/100));
		refresh();
	}
	else if (deltaY > 0) {
		view.scale *= Math.pow(ZOOM_RATE,Math.abs(deltaY/100));
		refresh();
	}
}