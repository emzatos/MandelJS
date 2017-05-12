let IMAX = 100;
const ZOOM_RATE = 1.2;
const USE_RECTS = false;

let profile = false;
let sampleScale = 1, SCALE_MAX = 12;
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let tempcanvas = document.createElement("canvas");
tempcanvas.width = canvas.width;
tempcanvas.height = canvas.height;

let ctx = canvas.getContext("2d");
let tctx = tempcanvas.getContext("2d");
let idata = ctx.getImageData(0,0,canvas.width,canvas.height);

let view = new Rectangle(0,0,canvas.width,canvas.height);
view.scale = 0.004;

let gfxDirty = true;
let renderYstart = 0;

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

frame();

function frame() {
	//skip frame if not dirty
	if (!gfxDirty && !profile) {
		requestAnimationFrame(frame);
		return;
	}

	//render whole screen
	let yStop = render(view, sampleScale, renderYstart);
	if (yStop >= canvas.height) {
		renderYstart = 0;

		//progressively increase sample resolution
	 	if (sampleScale>1) {
	 		sampleScale = Math.max(1,Math.floor(sampleScale/4));
	 		gfxDirty = true;
	 	}
	 	else {
	 		gfxDirty = false;
	 	}
	}
	else {
		renderYstart = yStop+1;
	}
	
	requestAnimationFrame(frame);
}

/**
 * Renders an area of the screen.
 * Returns the area rendered.
 */
function render(view, step, yStart=0, timeLimit=50) {
	let ibuffer = new ArrayBuffer(canvas.width*canvas.height*4);
	let ibuffer8 = new Uint8ClampedArray(ibuffer);
	let ibuffer32 = new Uint32Array(ibuffer);

	//rectangle "optimization"
	if (USE_RECTS) {
		fillRects(new Rectangle(0,0,canvas.width/2, canvas.height));
		fillRects(new Rectangle(canvas.width/2, 0, canvas.width/2, canvas.height));
		requestAnimationFrame(render);
		return;
	}

	//compute mandelbrot
	let t0 = Date.now();
	let invstep = 1/step;

	let x,y;
	let w = canvas.width, h = canvas.height;
	for (y=yStart; y<h; y=y+step) {
		for (x=0; x<w; x=x+step) {
			let m = mandelbrot(x,y,view);
			ibuffer32[y*w*invstep+x*invstep] = colormap[m];
		}
		if (Date.now() - t0 > timeLimit) {
			break;
		}
	}

	//copy data back to canvas
	idata.data.set(ibuffer8);
	tctx.putImageData(idata,0,0);

	//upscale to canvas
	ctx.drawImage(tempcanvas,0,0,canvas.width*step,canvas.height*step);

	return y;
}

function refresh() {
	sampleScale = SCALE_MAX;
	renderYstart = 0;
	gfxDirty = true;
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