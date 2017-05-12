let dragging = false;
let dragStart = {x: 0, y: 0};
let viewStart = {x: 0, y: 0};
let gfxDirty = true;

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
	if (event.targetTouches.length === 2)
		eWheel(-1);
	else if (event.targetTouches.length === 3)
		eWheel(1);
	else {
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
	gfxDirty = true;
}
function eDrag(x,y) {
	if (dragging) {
		view.x = viewStart.x + (x - dragStart.x)*view.scale;
		view.y = viewStart.y + (y - dragStart.y)*view.scale;
		gfxDirty = true;
		sampleScale = SCALE_MAX;
	}
}
function eWheel(deltaY) {
	gfxDirty = true;
	sampleScale = SCALE_MAX;
	if (deltaY < 0)
		view.scale /= ZOOM_RATE;
	else if (deltaY > 0)
		view.scale *= ZOOM_RATE;
	else {
		gfxDirty = false;
		sampleScale = 1;
	}
}