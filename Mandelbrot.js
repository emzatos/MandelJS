//var IMAX = 200;
const ZOOM_RATE = 1.2;
const USE_RECTS = false;
let profile = false;
let SCALE_MAX = 8;
let sampleScale = SCALE_MAX;
let frameTime = {scale: 1, time: 0, t0: Date.now()};
let canvas, tempcanvas;
let ctx, tctx, idata;
let colormap;
let view;
let gfxDirty = true;
let renderYstart = 0;
let ibuffer, ibuffer8, ibuffer32;
let workerPool;

let params = {
	color1 : '#1C1D21',
	color2 : '#31353D',
	color3 : '#445878',
	color4 : '#92CDCF',
	color5 : '#EEEFF7',
	multisample: 0,
	cRe: -0.8,
	cIm: 0.166
}

var Json = {
	"preset": "Quiet Cry",
	"remembered": {
		"Quiet Cry": {
			"0": {
				color1 : '#1C1D21',
				color2 : '#31353D',
				color3 : '#445878',
				color4 : '#92CDCF',
				color5 : '#EEEFF7',
			}
		},
		"Blue Sky": {
			"0": {
				color1 : '#16193B',
				color2 : '#35478C',
				color3 : '#4E7AC7',
				color4 : '#7FB2F0',
				color5 : '#ADD5F7',
			}
		},
		"Sunset Camping": {
			"0": {
		        color1: "#2d112d",
		        color2: "#530035",
		        color3: "#822701",
		        color4: "#cfa964",
		        color5: "#ffffd4",
			}
		},
		"Mandel": {
			"0": {
				color1 : 'navy',
				color2 : 'white',
				color3 : 'orange',
				color4 : 'red',
				color5 : 'black',
			}
		},
		"Mandel Invert": {
			"0": {
				color1 : 'black',
				color2 : 'red',
				color3 : 'orange',
				color4 : 'white',
				color5 : 'navy',
			}
		}
	},
	"closed": true,
	"folders": {}
}

function init() {
	//get DOM elements
	debugText = document.getElementById("debugText");
	canvas = document.getElementById("canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	tempcanvas = document.createElement("canvas");
	tempcanvas.width = canvas.width;
	tempcanvas.height = canvas.height;

	//prepare canvases
	ctx = canvas.getContext("2d");
	tctx = tempcanvas.getContext("2d");
	idata = ctx.getImageData(0,0,canvas.width,canvas.height);

	//prepare buffers
	ibuffer = new ArrayBuffer(canvas.width*canvas.height*4);
	ibuffer8 = new Uint8ClampedArray(ibuffer);
	ibuffer32 = new Uint32Array(ibuffer);

	//setup view
	view = {
		x: 0,
		y: 0,
		w: canvas.width,
		h: canvas.height,
		scale: 0.004,
		sampleScale: 1,
		IMAX: 200,
		serialize: function() {
			return {x: this.x, y: this.y, scale: this.scale, IMAX: this.IMAX};
		},
		deserialize: function(data) {
			Object.keys(data).forEach(k => this[k] = data[k]);
		},
		raw: function() {
			return {x: this.x, y: this.y, scale: this.scale, IMAX: this.IMAX, w: this.w, h: this.h};
		}
	}

	//parse view data contained in hash, if any
	if (document.location.hash) {
		let parsed = JSON.parse(document.location.hash.substring(1));
		view.deserialize(parsed);
	}

	//prepare GUI
	gui = new dat.GUI({load:Json});
	gui.remember(params);
	gui.addColor(params, 'color1').onChange(updateColors);
	gui.addColor(params, 'color2').onChange(updateColors);
	gui.addColor(params, 'color3').onChange(updateColors);
	gui.addColor(params, 'color4').onChange(updateColors);
	gui.addColor(params, 'color5').onChange(updateColors);
	gui.add(view, 'IMAX', 10, 1000).step(1).onChange(updateColors);
	gui.add(params, 'multisample', 0, 8).step(1).onChange(refresh);

	let folder = gui.addFolder('Julia');
	folder.add(params, 'cRe', -1, 1).onChange(updateColors);
	folder.add(params, 'cIm', -1, 1).onChange(updateColors);
	folder.close();

	//prepare workers
	const N_WORKERS = 16;
	workerPool = [];
	for (let i=0; i<N_WORKERS; i++) {
		let worker = new Worker("MandelWorker.js");
		let y0 = Math.floor(i/N_WORKERS*view.h);
		let y1 = Math.ceil((i+1)/N_WORKERS*view.h);
		let buffer = new Float64Array((y1-y0)*view.w);
		workerPool.push({
			worker: worker,
			y0: y0,
			y1: y1,
			buffer: buffer
		});
	}

	//start
	updateColors();
	frame();
}

function updateColors(){
	colormap = chroma.scale([params.color1, params.color2, params.color3, params.color4, params.color5].reverse())
	.domain([0,view.IMAX/4,view.IMAX/2, 3*view.IMAX/4, view.IMAX])
	.colors(view.IMAX+1).map(col => {
		let rgb = chroma(col).rgb();
		return (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | (rgb[0]);
	});
}

function frame() {
	//skip frame if not dirty
	if (!gfxDirty && !profile) {
		requestAnimationFrame(frame);
		return;
	}

	//render whole screen
	renderParallel(view, sampleScale, params.multisample, function(){
		frameTime.scale = sampleScale;
		frameTime.time = (Date.now() - frameTime.t0)/1000;
		frameTime.t0 = Date.now();

		//progressively increase sample resolution
		if (sampleScale>1) {
			sampleScale = Math.max(1,Math.floor(sampleScale/4));
			gfxDirty = true;
		}
		else {
			gfxDirty = false;
		}

		updateDebug();
		requestAnimationFrame(frame);
	});
}

function updateDebug(){
 	debugText.innerHTML = [
 		`10^${Math.log10((1/(view.scale/0.004))).toFixed(1)}x zoom`,
 		`${frameTime.scale}X: ${frameTime.time.toFixed(2)}s`
 	].join("<br>");
}

function renderParallel(view, step, multisample=0, callback) {
	ibuffer32.fill(0);
	let invstep = 1/step;
	let s = step;

	let lock = 0;
	for (let i=workerPool.length-1; i>=0; i--) {
		let data = workerPool[i];
		lock++;

		// data.worker.terminate();
		data.worker.onmessage = function(event) {
			lock--;
			let buffer = event.data.buffer;
			let w = view.w, h = view.h;
			data.buffer = buffer;

			for (let y=data.y0; y<data.y1; y=y+step) {
				for (let x=0; x<w; x=x+step) {
					let didx = y*w+x;
					let sidx = (y-data.y0)*w+x;
					ibuffer32[didx] = colormap[buffer[sidx]];
				}
			}

			if (lock === 0) {
				//copy data back to canvas
				idata.data.set(ibuffer8);
				tctx.putImageData(idata,0,0);

				//upscale to canvas
				ctx.drawImage(tempcanvas,0,0,canvas.width,canvas.height);
				callback();
			}
		};
		data.worker.postMessage({
			buffer: data.buffer,
			view: view.raw(),
			step: s,
			y0: data.y0,
			y1: data.y1
		}, [data.buffer.buffer]);
	}
}

/**
 * Renders an area of the screen.
 * Returns the area rendered.
 */
 function render(view, step, yStart=0, multisample=0, timeLimit=100) {
 	ibuffer32.fill(0);

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
	let once = false;

	let x,y;
	let w = canvas.width, h = canvas.height;
	for (y=yStart; y<h; y=y+step) {
		for (x=0; x<w; x=x+step) {
			let m;
			switch (multisample) {
				case 0:
					m = mandelbrot(x,y,view);
				break;
				default:
					m = 0;
					for (let i=0; i<=multisample; i++)
						m = m+mandelbrot(x+fastRand(-0.5,0.5),y+fastRand(-0.5,0.5),view);
					m = m/(multisample+1);
					m = ~~m;
				break;
			}
			ibuffer32[y*w*invstep+x*invstep] = colormap[m];
		}
		if (once && Date.now() - t0 > timeLimit) {
			break;
		}
		once = true;
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

function norm(x,y){
	return Math.sqrt(x*x+y*y);
}

function julia(px,py, view){
	let x = ((px - view.w/2)*view.scale-view.x),
	y = ((py - view.h/2)*view.scale-view.y);
	
	//let x = 0, y = 0;
	let x2, y2;
	var iteration = 0;
	while (iteration < view.IMAX && (x2=x*x) + (y2=y*y) < 4) {
		//let xtemp = x2 - y2+ x0;
		y = 2*x*y+params.cIm;
		x = x2-y2+params.cRe;
		iteration++;
	}
	return iteration;
}

function mandelbrot(px, py, view) {
	let x0 = ((px - view.w/2)*view.scale-view.x),
	y0 = ((py - view.h/2)*view.scale-view.y);

	
	let q = (x0-0.25) * (x0-0.25) + y0*y0;
	if (q * (q + (x0-0.25)) < y0 * y0 * 0.25 || (x0+1) * (x0+1) + y0*y0 < 0.0625) {
		return view.IMAX;
	}

	let x = 0, y = 0;
	let x2, y2;
	var iteration = 0;
	while (iteration < view.IMAX && (x2=x*x) + (y2=y*y) < 4) {
		y = 2*x*y + y0;
		x = x2 - y2 + x0;
		iteration++;
	}
	return iteration;
}

function printRGB(color){
	return 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
}

fastRand = (function(){
	const len = 373;
	let rand = [], idx = 0;
	for (let i=0; i<len; i++)
		rand.push(Math.random());
	return function(a,b) {
		return rand[idx=(idx+1)%len] * (b-a) + a;
	};
})();

init();