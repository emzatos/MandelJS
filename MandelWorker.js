self.buffer = null;
self.workTimeout = null;
self.onmessage = function(event) {
	if (event.data.type === "startWork") {
		self.params = event.data;
		self.y0 = self.params.y0;
		performWork(event.data);
	}
	else if (event.data.type === "requestBuffer") {
		let buffer = self.buffer;
		if (buffer === null) {
			self.postMessage({
				type: "sendBuffer",
				success: false,
				buffer: null
			});
		}
		else {
			self.postMessage({
				type: "sendBuffer",
				success: true,
				buffer: buffer
			}, [buffer.buffer]);
		}
		self.buffer = null;
	}
	else if (event.data.type === "sendBuffer") {
		self.buffer = event.data.buffer;
		self.postMessage({
			type: "ok"
		});
	}
	else if (event.data.type === "abort") {
		if (self.workTimeout >= 0) {
			clearTimeout(self.workTimeout);
			self.workTimeout = -1;
			self.postMessage({
				type: "workDone",
				success: false
			});
		}
	}
	else if (event.data.type === "ok") {
		console.log("OK");
	}
	else {
		throw new Error("Received unsupported message type.");
	}
};

function performWork() {
	//check to ensure ownership of buffer
	var buffer = self.buffer;
	if (buffer === null) {
		self.postMessage({
			type: "workDone",
			success: false
		});
		return;
	}

	//alias params
	var step = self.params.step;
	var view = self.params.view;
	var w = view.w;
	var y0 = self.params.y0;
	var y1 = self.params.y1;
	var multisample = self.params.multisample;

	//do computation
	var t0 = performance.now();
	var f = view.julia_flag ? julia : mandelbrot;
	for (var y=self.y0; y<=y1; y=y+step) {
		for (var x=0; x<w; x=x+step) {
			var m;
			switch (multisample) {
				case 0:
					m = f(x,y,view);
				break;
				default:
					m = 0;
					for (var i=0; i<=multisample; i++)
						m = m + f(x+fastRand(-0.5,0.5),y+fastRand(-0.5,0.5),view);
					m = m/(multisample+1);
					m = ~~m;
				break;
			}

			var didx = (y-y0)*w+x;
			buffer[didx] = m;
		}
		if (performance.now() - t0 > 30) {
			self.y0 = y;
			self.workTimeout = setTimeout(performWork, 0);
			return;
		}
	}
	
	self.workTimeout = -1;
	self.postMessage({
		type: "workDone",
		buffer: self.buffer,
		success: true
	}, [self.buffer.buffer]);
}

function mandelbrot(px, py, view) {
	let x0 = ((px - view.w/2)*view.currentScale-view.x),
	y0 = ((py - view.h/2)*view.currentScale-view.y);
	
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
	let x = ((px - view.w/2)*view.currentScale-view.x),
	y = ((py - view.h/2)*view.currentScale-view.y);
	
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