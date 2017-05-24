self.onmessage = function(event) {
	let buffer = event.data.buffer;
	let step = event.data.step;
	let view = event.data.view;
	let w = view.w;
	let y0 = event.data.y0;
	let y1 = event.data.y1;
	let multisample = event.data.multisample

	let f = view.julia_flag ? julia : mandelbrot;
	for (let y=y0; y<=y1; y=y+step) {
		for (let x=0; x<w; x=x+step) {
			let m;
			switch (multisample) {
				case 0:
					m = f(x,y,view);
				break;
				default:
					m = 0;
					for (let i=0; i<=multisample; i++)
						m = m + f(x+fastRand(-0.5,0.5),y+fastRand(-0.5,0.5),view);
					m = m/(multisample+1);
					m = ~~m;
				break;
			}

			let didx = (y-y0)*w+x;
			buffer[didx] = m;
		}
	}
	self.postMessage({buffer: buffer}, [buffer.buffer]);
};

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

function julia(px,py, view) {
	let x = ((px - view.w/2)*view.scale-view.x),
	y = ((py - view.h/2)*view.scale-view.y);
	
	let x2, y2;
	var iteration = 0;
	while (iteration < view.IMAX && (x2=x*x) + (y2=y*y) < 4) {
		y = 2*x*y+view.cIm;
		x = x2-y2+view.cRe;
		iteration++;
	}
	return iteration;
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