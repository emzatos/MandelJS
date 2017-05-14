//var IMAX = 200;
const ZOOM_RATE = 1.2;
const USE_RECTS = false;
let SCALE_MAX = 12;
let sampleScale = SCALE_MAX;

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
				color1 : '#2D112C',
				color2 : '#530031',
				color3 : '#820233',
				color4 : '#CA293E',
				color5 : '#EF4339',

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

let prevx0=0, prevy0=0, previter=params.IMAX;
let profile = false;
let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let tempcanvas = document.createElement("canvas");
tempcanvas.width = canvas.width;
tempcanvas.height = canvas.height;

let ctx = canvas.getContext("2d");
let tctx = tempcanvas.getContext("2d");
let idata = ctx.getImageData(0,0,canvas.width,canvas.height);

let view = {
	x: 0,
	y: 0,
	w: canvas.width,
	h: canvas.height,
	scale: 0.004,
	serialize: function() {
		return {x: this.x, y: this.y, scale: this.scale};
	},
	deserialize: function(data) {
		Object.keys(data).forEach(k => this[k] = data[k]);
	}
}
view.scale = 0.004;

if (document.location.hash) {
	let parsed = JSON.parse(document.location.hash.substring(1));
	view.deserialize(parsed);
}

let colormap;

function updateColors(){

	colormap = chroma.scale([params.color1, params.color2, params.color3, params.color4, params.color5].reverse())
	.domain([0,params.IMAX/4,params.IMAX/2, 3*params.IMAX/4, params.IMAX])
	.colors(params.IMAX+1).map(col => {
		let rgb = chroma(col).rgb();
		return (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | (rgb[0]);
	});
}

let params = {
	color1 : '#1C1D21',
	color2 : '#31353D',
	color3 : '#445878',
	color4 : '#92CDCF',
	color5 : '#EEEFF7',
	IMAX: 200,
	multisample: 0
}


let gui = new dat.GUI({load:Json});

gui.remember(params);
gui.addColor(params, 'color1').onChange(updateColors);
gui.addColor(params, 'color2').onChange(updateColors);
gui.addColor(params, 'color3').onChange(updateColors);
gui.addColor(params, 'color4').onChange(updateColors);
gui.addColor(params, 'color5').onChange(updateColors);
gui.add(params, 'IMAX', 10, 1000).step(1).onChange(updateColors);
gui.add(params, 'multisample', 0, 8).step(1).onChange(refresh);
let folder = gui.addFolder('Julia');
folder.add(params, 'cRe', -1, 1).onChange(updateColors);
folder.add(params, 'cIm', -1, 1).onChange(updateColors);
folder.close();

let gfxDirty = true;
let renderYstart = 0;

function frame() {
	//skip frame if not dirty
	if (!gfxDirty && !profile) {
		requestAnimationFrame(frame);
		return;
	}

	//render whole screen
	let yStop = render(view, sampleScale, renderYstart, params.multisample);
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
		renderYstart = yStop;
	}
	
	requestAnimationFrame(frame);
}

/**
 * Renders an area of the screen.
 * Returns the area rendered.
 */


 function showZoom(){
 	ctx.fillStyle = 'black';
 	ctx.font = 'normal 10pt Courier New';
 	ctx.fillText((1/(view.scale/0.004)).toFixed(2) + "x zoom", 10,20);

 }


 function render(view, step, yStart=0, multisample=0, timeLimit=50) {
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
	showZoom();

	return y;
}

function refresh() {
	sampleScale = SCALE_MAX;
	renderYstart = 0;
	gfxDirty = true;

	history.replaceState(undefined, undefined, "#"+JSON.stringify(view.serialize()));
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
	while (iteration < params.IMAX && (x2=x*x) + (y2=y*y) < 4) {
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
	if(q * (q + (x0-0.25)) < y0 * y0 * 0.25 || (x0+1) * (x0+1) + y0*y0 < 0.0625){

		return params.IMAX;

	}

	let x = 0, y = 0;
	let x2, y2;
	var iteration = 0;
	while (iteration < params.IMAX && (x2=x*x) + (y2=y*y) < 4) {
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

fastRand = (function(){
	const len = 373;
	let rand = [], idx = 0;
	for (let i=0; i<len; i++)
		rand.push(Math.random());
	return function(a,b) {
		return rand[idx=(idx+1)%len] * (b-a) + a;
	};
})();

updateColors();
frame();