/* Display setup */
var displayArea = {width: 960, height: 500},
	pathviewHeight = 50,
	margin = {top: 20, right: 20, bottom: 20, left: 20},
	body = d3.select("body"),
	svgPathView = body.append("svg")
        .attr("width", displayArea.width)
        .attr("height", pathviewHeight),
    svgOverview = body.append("svg")
        .attr("width", displayArea.width / 2)
        .attr("height", displayArea.height - pathviewHeight),
	svgMainView = body.append("svg")
        .attr("width", displayArea.width / 2)
        .attr("height", displayArea.height - pathviewHeight),
	pathview = { // File path view
		width: svgPathView.attr("width") - margin.left - margin.right,
		height: svgPathView.attr("height") - margin.top - margin.bottom,
		g: svgPathView.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
	},
    overview = { // Tree view
		width: svgOverview.attr("width") - margin.left - margin.right,
		height: svgOverview.attr("height") - margin.top - margin.bottom,
		g: svgOverview.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
	},
	mainview = { // Bubbles/Radial view
		width: svgMainView.attr("width") - margin.left - margin.right,
		height: svgMainView.attr("height") - margin.top - margin.bottom,
		g: svgMainView.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
	};

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

    /* Building directory tree */
    var root = buildTree(data); // From file dataTools.js

    displayTree(root);
}

/* Display functions */
function displayTree(data) {
    /*var treeView = g.append("g")
        .classed("treeView", true);

    treeView.selectAll("circle.treeNode")
        .data([data])
        .enter()
        .append("circle")
            .classed("treeNode", true)
            .attr("cx", 10)
            .attr("cy", overview.height / 2)
            .attr("r", 10);
    treeView.selectAll("text.treeNodeText")
        .data([data])
        .enter()
        .append("text")
            .classed("treeNodeText", true)
            .text(function (d) {
                return d.filename;
            })
            .attr("x", 10)
            .attr("y", overview.height / 2 + 32)
            .style("font-size", 20);
*/

}



init();
