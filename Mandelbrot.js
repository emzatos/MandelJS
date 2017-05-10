let IMAX = 200;
const ZOOM_RATE = 1.3;

let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");

let view = {
	x: 0,
	y: 0,
	w: canvas.width,
	h: canvas.height,
	scale: 0.004
};
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

//generate color lookup table
let f  = function(color){
	return chroma(color).rgb();
}
let colormap = chroma.scale(['black','white']).domain([0,IMAX]).colors(300).map(f);

render();

function render() {
	if (!gfxDirty) {
		requestAnimationFrame(render);
		return;
	}
	gfxDirty = false;

	ctx.fillStyle = "lime";
	ctx.fillRect(0,0,canvas.width,canvas.height);
	let idata = ctx.getImageData(0,0,canvas.width,canvas.height);
	let data = idata.data;
	let index = 0;
	

	for (let y=0,h=canvas.height; y<h; y++) {
		for (let x=0,w=canvas.width; x<w; x++) {
			let m = mandelbrot(x,y,view);

			data[index+0] = colormap[m][0];
			data[index+1] = colormap[m][1];
			data[index+2] = colormap[m][2];
			data[index+3] = 255;
			index = index + 4;
		}
	}
	ctx.putImageData(idata,0,0);
	requestAnimationFrame(render);
}

function mandelbrot(px, py, view) {
	const MAX = IMAX;
	let x0 = ((px - view.w/2)*view.scale-view.x),
	y0 = ((py - view.h/2)*view.scale-view.y);

	let q = (x0-1/4) * (x0-1/4) + y0*y0;
	if(q * (q + (x0-1/4)) < y0 * y0 * 1/4 || (x0+1) * (x0+1) + y0*y0 < 1/16){
		return IMAX;
	}

	let x = 0, y = 0;
	let x2, y2;
	var iteration = 0;
	while (iteration < MAX && (x2=x*x) + (y2=y*y) < 4) {
		let xtemp = x2 - y2 + x0;
		y = 2*x*y + y0;
		x = xtemp;
		iteration++;
	}
	return iteration * IMAX / MAX;
}