let IMAX = 299;
const ZOOM_RATE = 1.3;

let profile = false;
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");
let idata = ctx.getImageData(0,0,canvas.width,canvas.height);
let ibuffer = new ArrayBuffer(idata.data.length);
let ibuffer8 = new Uint8ClampedArray(ibuffer);
let ibuffer32 = new Uint32Array(ibuffer);

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
let colormap = chroma.scale(['navy','white','red','black'])
	.domain([0,IMAX/3,2*IMAX/3, IMAX])
	.colors(300).map(col => {
		let rgb = chroma(col).rgb();
		return (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | (rgb[0]);
	});

render();

function render() {
	if (!gfxDirty && !profile) {
		requestAnimationFrame(render);
		return;
	}
	gfxDirty = false;
	
	let data = idata.data;
	let index = 0;

	for (let y=0,h=canvas.height; y<h; y++) {
		for (let x=0,w=canvas.width; x<w; x++) {
			let m = mandelbrot(x,y,view);

			ibuffer32[index] = colormap[m];
			index = index + 1;
		}
	}
	data.set(ibuffer8);
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