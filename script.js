/* Display config */
var margin = {top: 20, right: 20, bottom: 20, left: 20},
    svg = d3.select("body").append("svg")
        .attr("width", 960)
        .attr("height", 500),
    width = svg.attr("width") - margin.left - margin.right,
    height = svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g") // Whole canvas
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
    overview = {width: Math.min(width / 5, 300), height: height}, // Tree view
    mainZone = {width: width - overview.width, height: height}; // Bubbles/Radial view

/* Format and conversion  functions */
var displayDate = d3.timeFormat("%d/%m/%Y - %H:%M");
var fileSizeFormat = d3.format(",.1f");
function readableFileSize(aSize){ // http://blog.niap3d.com/fr/5,10,news-16-convertir-des-octets-en-javascript.html
	aSize = Math.abs(parseInt(aSize, 10));
	var def = [[1, 'octets'], [1024, 'ko'], [1024*1024, 'Mo'], [1024*1024*1024, 'Go'], [1024*1024*1024*1024, 'To']];
	for(var i=0; i<def.length; i++){
		if(aSize < def[i][0]){
            return fileSizeFormat(aSize/def[i-1][0]) + ' ' + def[i-1][1];
        }
	}
}

/* Setup functions */
function init(){
    d3.queue()
    	.defer(d3.csv, "./outputfile.csv")
    	.await(processData);

}

function processData(error, data){
    if (error) throw error;
    console.log(data.length);
    console.log(data[0]);
}

/* Display functions */




init();
