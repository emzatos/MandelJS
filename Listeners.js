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