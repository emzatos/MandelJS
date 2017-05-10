


 function mandel(px, py){
 	x0 = scaleX(px)
 	y0 = scaleY(py);
 	x = 0.0
 	y = 0.0
 	iteration = 0
 	max_iteration = 1000
 	while (x*x + y*y < 2*2 && iteration < max_iteration) {
 		xtemp = x*x - y*y + x0
 		y = 2*x*y + y0
 		x = xtemp
 		iteration = iteration + 1
 	}

 	return iteration;
 }


 function scaleX(input){
 	var output_start = -2.5;
 	var output_end = 1;
 	var input_start = 0;
 	var input_end = 300;

 	return output_start + ((output_end - output_start) / (input_end - input_start)) * (input - input_start);

 }

 function scaleY(input){
 	var output_start = -1;
 	var output_end = 1;
 	var input_start = 0;
 	var input_end = 300;

 	return output_start + ((output_end - output_start) / (input_end - input_start)) * (input - input_start);

 }
 var rgb = [];

 for(var i = 0; i < 1004; i++)
 	rgb.push(Math.floor(Math.random() * 255));


 function draw() {
 	var canvas = document.getElementById('canvas');
 	canvas.width = window.innerWidth;
 	canvas.height = window.innerHeight;

 	if (canvas.getContext) {

 		var ctx = canvas.getContext('2d');
 		var idata = ctx.getImageData(0,0,canvas.width, canvas.height);
 		var data = idata.data;

 		for(var x=0; x<canvas.width; x++){
 			for(var y=0; y<canvas.height; y++){
 				var index = (y*canvas.width+x)*4;
 				var result = mandel(x,y);

 				data[index+0] = rgb[result]
 				data[index+1] = rgb[result+1]
 				data[index+2] = rgb[result+2]
 				data[index+3] = rgb[result+3]

 				

 			}
 		}

 		ctx.putImageData(idata, 0, 0);



 	}
 }