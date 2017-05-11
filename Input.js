let dragging = false;
let dragStart = {x: 0, y: 0};
let viewStart = {x: 0, y: 0};
let gfxDirty = true;

//event listeners
canvas.addEventListener("mousedown",function(event){eDragStart(event.layerX, event.layerY)},false);
document.addEventListener("mouseup",function(event){eDragEnd()},false);
document.addEventListener("mousemove", function(event){eDrag(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop)},false);
canvas.addEventListener("wheel", function(event){
	gfxDirty = true;
	let dy = event.deltaY;
	if (dy < 0)
		view.scale /= ZOOM_RATE;
	else if (dy > 0)
		view.scale *= ZOOM_RATE;
	else
		gfxDirty = false;
},false);

function eDragStart(x,y) {
	dragging = true;
	dragStart.x = event.layerX;
	dragStart.y = event.layerY;
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
	}
}