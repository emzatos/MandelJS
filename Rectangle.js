
class Rectangle{
	constructor(x,y,w,h){
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
}



function checkRect(rect){
	let values = []

	for(var i=rect.x; i<=rect.x+rect.w; i++){
		if(i == rect.x || i == rect.x+rect.w){
			//calculate whole column

			for(var j=rect.y; j<=rect.y+rect.h; j++){
				values.push(mandelbrot(i, j, view));
			}

		}else{
			//calculate first and last points
			values.push(mandelbrot(i, rect.y, view));
			values.push(mandelbrot(i, rect.h, view));

		}
	}
	let ref = values[0]
	if(values.length == 0){
		console.log("ficK");
		return -1;
	}
	if(values.every(x => x >= params.IMAX)){
		return 1;
	}

	if(values.every(x=> x < params.IMAX))
		return 2;

	else{
		return 0;
	}


}


function fillRects(rect){
	//console.log(rect)
	var ref = checkRect(rect);
	if(ref == 1){


		ctx.fillStyle = "black"
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		return;


	}

	if(ref == 2){
		ctx.fillStyle = "blue";
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		return;
	}

	else if (ref == 0){
		fillRects(new Rectangle(rect.x, rect.y, rect.w/2, rect.h/2));
		fillRects(new Rectangle(rect.x + rect.w/2, rect.y, rect.w/2, rect.h/2));
		fillRects(new Rectangle(rect.x, rect.y + rect.h/2, rect.w/2, rect.h/2));
		fillRects(new Rectangle(rect.x + rect.w/2, rect.y + rect.h/2, rect.w/2, rect.h/2));
	}else{
		ctx.fillStyle = "red";
		ctx.fillRect(rect.x, rect.y, 1,1);
	}
}
