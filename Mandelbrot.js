let IMAX = 100;
const ZOOM_RATE = 1.2;
const USE_RECTS = false;
const SAMPLE_DEBOUNCE = 100;

let profile = false;
let sampleScale = 1, SCALE_MAX = 8;
let sampleTimeout = -1;
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext("2d");
let idata = ctx.getImageData(0,0,canvas.width,canvas.height);
let ibuffer = new ArrayBuffer(idata.data.length);
let ibuffer8 = new Uint8ClampedArray(ibuffer);
let ibuffer32 = new Uint32Array(ibuffer);

let view = new Rectangle(0,0,canvas.width,canvas.height);
view.scale = 0.004;

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
	render(view, sampleScale, new Rectangle(0,0,canvas.width,canvas.height));

	//progressively increase sample resolution
 	if (sampleScale>1) {
 		sampleScale = Math.floor(sampleScale/2);
 		clearTimeout(sampleTimeout);
 		sampleTimeout = setTimeout(function(){
 			gfxDirty = true;
 		}, SAMPLE_DEBOUNCE);
 	}
	requestAnimationFrame(frame);
}

function render(view, step, screenRect) {
	//rectangle "optimization"
	if (USE_RECTS) {
		fillRects(new Rectangle(0,0,canvas.width/2, canvas.height));
		fillRects(new Rectangle(canvas.width/2, 0, canvas.width/2, canvas.height));
		requestAnimationFrame(render);
		return;
	}

	//compute mandelbrot
	let data = idata.data;
	let invstep = 1/step;
	for (let y=0,h=canvas.height; y<h; y=y+step) {
		for (let x=0,w=canvas.width; x<w; x=x+step) {
			let m = mandelbrot(x,y,view);

			ibuffer32[y*w*invstep+x*invstep] = colormap[m];
		}
	}

	//copy data back to canvas
	data.set(ibuffer8);
	ctx.putImageData(idata,0,0);

	//upscale canvas if necessary
	if (step !== 0)
		ctx.drawImage(canvas,0,0,canvas.width*step,canvas.height*step);	
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