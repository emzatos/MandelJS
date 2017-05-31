//var IMAX = 200;
const N_WORKERS = navigator.hardwareConcurrency || 4;
const ZOOM_RATE = 1.1, ZOOM_QUICKNESS = 0.25;
const USE_RECTS = false;
let profile = false;
let SCALE_MAX = 8;
let sampleScale = SCALE_MAX;
let frameTime = {scale: 1, time: 0, t0: Date.now()};
let canvas, tempcanvas;
let ctx;
let colormap;
let view;
let gfxDirty = true;
let renderYstart = 0;
let ibuffer, ibuffer8, ibuffer32, idata;
let workerPool;
let bufferCleared = true;

let params = {
	color1 : '#1C1D21',
	color2 : '#31353D',
	color3 : '#445878',
	color4 : '#92CDCF',
	color5 : '#EEEFF7',
	multisample: 0,
	julia_flag: false,
	cRe: -0.8,
	cIm: 0.166,
	IMAX: 200,
	displayGuides: true
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

	//prepare canvases
	ctx = canvas.getContext("2d");

	//prepare buffers
	ibuffer = new ArrayBuffer(canvas.width*canvas.height*4);
	ibuffer8 = new Uint8ClampedArray(ibuffer);
	ibuffer32 = new Uint32Array(ibuffer);
	idata = new ImageData(ibuffer8, canvas.width, canvas.height);

	resetView();

	//parse view data contained in hash, if any
	if (document.location.hash) {
		let parsed = JSON.parse(atob(document.location.hash.substring(1)));
		view.deserialize(parsed);
	}

	//prepare GUI
	gui = new dat.GUI({load:Json});
	gui.remember(params);


	gui.add({
		"Share view": function() {
			prompt(
				"Copy the link to share:", 
				document.location.origin + document.location.pathname + "#" +btoa(JSON.stringify(view.sharable()))
				);
		}
	}, "Share view");
	gui.add({"Reset view": resetView}, "Reset view");
	gui.add({"Export view": function(){
		var download = function (){
			window.open(document.getElementById('canvas').toDataURL("image/png"));
		}

		frameTime.scale == 1 ? download() : alert('Canvas not fully rendered');
	}}, "Export view");
	let color_folder = gui.addFolder('Colors');

	color_folder.addColor(params, 'color1').onChange(updateColors);
	color_folder.addColor(params, 'color2').onChange(updateColors);
	color_folder.addColor(params, 'color3').onChange(updateColors);
	color_folder.addColor(params, 'color4').onChange(updateColors);
	color_folder.addColor(params, 'color5').onChange(updateColors);

	let render_folder = gui.addFolder('Render');

	render_folder.add(view, 'IMAX', 10, 1000).step(1).onChange(updateColors);
	render_folder.add(params, 'multisample', 0, 8).step(1).onChange(refresh);
	render_folder.add(params, 'displayGuides');

	let folder = gui.addFolder('Julia');
	folder.add(view, 'julia_flag');
	folder.add(view, 'cRe', -1, 1).onChange(updateColors);
	folder.add(view, 'cIm', -1, 1).onChange(updateColors);
	folder.close();

	//prepare workers
	workerPool = [];
	for (let i=0; i<N_WORKERS; i++) {
		let y0 = Math.floor(i/N_WORKERS*view.h);
		let y1 = Math.ceil((i+1)/N_WORKERS*view.h);
		let buffer = new Float64Array((y1-y0)*view.w);
		workerPool.push(new MWorker({
			y0: y0,
			y1: y1,
			buffer: buffer
		}));
	}

	//start
	updateColors();
	frame();
}

function resetView() {
	//setup view
	view = {
		x: 0,
		y: 0,
		w: canvas.width,
		h: canvas.height,
		scale: 0.004,
		currentScale: 0.004,
		sampleScale: 1,
		cRe: params.cRe,
		cIm: params.cIm,
		julia_flag: params.julia_flag,
		IMAX: params.IMAX,
		sharable: function() {
			let obj = this.serialize();
			let exclude = ["w","h","sampleScale","currentScale"];
			if (!obj.julia_flag)
				Array.prototype.push.apply(exclude, ["julia_flag", "cRe", "cIm"]);
			exclude.forEach(k => delete obj[k]);
			return obj;
		},
		deserialize: function(data) {
			Object.keys(data).forEach(k => this[k] = data[k]);
		},
		serialize: function() {
			let obj = {};
			Object.keys(this).forEach(k => {
				if (typeof this[k] !== "function")
					obj[k] = this[k];
			});
			return obj;
		}
	};
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

	if (view.currentScale !== view.scale) {
		view.currentScale = view.currentScale * (1-ZOOM_QUICKNESS) + view.scale * ZOOM_QUICKNESS;
		if (Math.abs(1-view.scale/view.currentScale) < 0.01)
			view.currentScale = view.scale;
	}

	//render whole screen
	renderParallel(view, sampleScale, params.multisample).then(function(){
		frameTime.scale = sampleScale;
		frameTime.time = (Date.now() - frameTime.t0)/1000;
		frameTime.t0 = Date.now();

		//progressively increase sample resolution
		if (sampleScale>1 && view.currentScale === view.scale) {
			sampleScale = Math.max(1,Math.floor(sampleScale/2));
			gfxDirty = true;
		}
		else if (view.currentScale === view.scale) {
			gfxDirty = false;
		}

		updateDebug();
		requestAnimationFrame(frame);
	});
}

function updateDebug(extraItems=[]){
	debugText.innerHTML = [
	`10^${Math.log10((1/(view.scale/0.004))).toFixed(1)}x zoom`,
	`${frameTime.scale}X: ${frameTime.time.toFixed(2)}s`
	].concat(extraItems).join("<br>");
}
updateDebug = debounce(updateDebug, 250);

async function renderParallel(view, step, multisample=0) {
	//ensure that buffer has been cleared
	await bufferCleared;

	let success = true;
	let promises = workerPool.map(async worker => {
		//wait for computation
		let buffer = await worker.startWork({
			view: view.serialize(),
			step: step,
			multisample: multisample
		});
		if (buffer === null)
			return;

		//copy computed values to image
		let w = view.w, h = view.h;
		let offset = Math.floor(worker.y0/step)*w;
		let rows = Math.ceil((worker.y1-worker.y0)/step);
		for (let row=0; row<rows; row=row+1) {
			for (let col=0, cols=w/step; col<cols; col=col+1) {
				let iSrc = (row*w+col)*step;
				let iDst = offset+row*w+col;
				ibuffer32[iDst] = colormap[buffer[iSrc]];
			}
		}
	});

	//wait for rendering
	await Promise.all(promises);

	//copy data back to canvas
	idata.data.set(ibuffer8);

	//create a bitmap from data
	let ibitmap = await createImageBitmap(idata);

	//begin clearing buffer
	bufferCleared = (async f => ibuffer32.fill(0))();

	//upscale to canvas
	ctx.drawImage(ibitmap,0,0,canvas.width*step,canvas.height*step);
	ibitmap.close();

	//draw guides
	if (step > 2 && params.displayGuides) {
		ctx.save();
		ctx.globalCompositeOperation = "difference";
		ctx.lineWidth = 2;
		ctx.strokeStyle = "white";
		ctx.setLineDash([2, 2]);
		ctx.beginPath();
		ctx.moveTo(Math.floor(canvas.width*0.5),0);
		ctx.lineTo(Math.floor(canvas.width*0.5),canvas.height);
		ctx.moveTo(0,Math.floor(canvas.height*0.5));
		ctx.lineTo(canvas.width,Math.floor(canvas.height*0.5));
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
	}
}

async function stopRendering() {
	await Promise.all(workerPool.map(worker => worker.terminate()));
}

async function refresh() {
	sampleScale = SCALE_MAX;
	gfxDirty = true;
	await stopRendering();
}

class MWorker {
	constructor(params) {
		this.worker = new Worker("MandelWorker.js");
		this.y0 = params.y0;
		this.y1 = params.y1;
		this.buffer = params.buffer;
	}

	async terminate() {
		this.worker.postMessage({
			type: "abort"
		});
	}

	sendBuffer() {
		if (this.buffer === null)
			throw new Error("Main thread does not own the buffer.");

		return new Promise((resolve) => {
			this.worker.onmessage = (event) => {
				resolve();
			};

			this.worker.postMessage({
				type: "sendBuffer",
				buffer: this.buffer
			}, [this.buffer.buffer]);
			
			this.buffer = null;
		});
	}

	requestBuffer() {
		if (this.buffer !== null)
			throw new Error("Main thread already owns the buffer.");

		return new Promise((resolve, reject) => {
			this.worker.onmessage = (event) => {
				if (event.data.type === "sendBuffer") {
					if (event.data.success) {
						this.buffer = event.data.buffer;
						resolve(this.buffer);
					}
					else {
						reject("Failed to request buffer from worker.");
					}
				}
			};
			this.worker.postMessage({
				type: "requestBuffer"
			});
		});
	}

	async startWork(params) {
		if (this.buffer !== null)
			await this.sendBuffer();

		return new Promise((resolve, reject) => {
			this.worker.onmessage = (event) => {
				if (event.data.success) {
					this.buffer = event.data.buffer;
					resolve(event.data.buffer);
				}
				else
					resolve(null);
			};
			this.worker.postMessage(Object.assign({
				type: "startWork",
				y0: this.y0,
				y1: this.y1
			}, params));
		});
	}
}

function debounce(func, wait) {
	let timer = null;
	let args = null;
	let context = null;
	let ready = true;
	let called = false;
	
	let call = function() {
		func.apply(context, args);
		ready = false;
		called = false;
		setTimeout(f => {
			ready = true;
			if (called)
				call();
		}, wait);
	};

	return function(){
		args = arguments;
		context = this;
		if (ready)
			call();
		else
			called = true;
	};
}




init();