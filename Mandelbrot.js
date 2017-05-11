let IMAX = 200;
const ZOOM_RATE = 1.1;
const USE_RECTS = false;

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

//generate color lookup table
let colormap_rgb = chroma.scale(['navy','white','red','black'])
	.domain([0,IMAX/3,2*IMAX/3, IMAX])
	.colors(IMAX+1).map(col => chroma(col).rgb());
let colormap = chroma.scale(['navy','white','red','black'])
	.domain([0,IMAX/3,2*IMAX/3, IMAX])
	.colors(IMAX+1).map(col => {
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

	//rectangle "optimization"
	if (USE_RECTS) {
		fillRects(new Rectangle(0,0,canvas.width/2, canvas.height));
		fillRects(new Rectangle(canvas.width/2, 0, canvas.width/2, canvas.height));
		requestAnimationFrame(render);
		return;
	}

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
	let x0 = ((px - view.w/2)*view.scale-view.x),
		y0 = ((py - view.h/2)*view.scale-view.y);

	let q = (x0-0.25) * (x0-0.25) + y0*y0;
	if(q * (q + (x0-0.25)) < y0 * y0 * 0.25 || (x0+1) * (x0+1) + y0*y0 < 0.0625){
		return IMAX;
	}

	let x = 0, y = 0;
	let x2, y2;
	var iteration = 0;
	while (iteration < IMAX && (x2=x*x) + (y2=y*y) < 4) {
		let xtemp = x2 - y2 + x0;
		y = 2*x*y + y0;
		x = xtemp;
		iteration++;
	}
	return iteration;
}

function printRGB(color){
	return 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
}