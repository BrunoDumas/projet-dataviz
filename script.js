/* Display setup */
var displayArea = {width: 500, height: 500},
	pathviewHeight = 50,
	margin = {top: 20, right: 20, bottom: 20, left: 20},
	body = d3.select("body"),
	svgPathView = body.append("svg")
        .attr("width", displayArea.width * 2)
        .attr("height", pathviewHeight),
    svgOverview = body.append("svg")
        .attr("width", displayArea.width)
        .attr("height", displayArea.height),
	svgMainView = body.append("svg")
        .attr("width", displayArea.width)
        .attr("height", displayArea.height),
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
	},
	r = Math.min(mainview.height, mainview.width),
	x = d3.scaleLinear().range([0, r]),
	y = d3.scaleLinear().range([0, r]);

mainview.g
	.append("rect")
		.attr("x", -margin.left)
		.attr("y",  -margin.top)
		.attr("width", mainview.width + margin.right + margin.left)
		.attr("height", mainview.height + margin.top + margin.bottom)
		.style("fill", "white")
		.style("stroke", "black")

overview.g
	.append("rect")
		.attr("x", -margin.left)
		.attr("y",  -margin.top)
		.attr("width", overview.width + margin.right + margin.left)
		.attr("height", overview.height + margin.top + margin.bottom)
		.style("fill", "white")
		.style("stroke", "black")

var tooltip = d3.select('body').append('div')
	.attr('class', 'hidden tooltip');


var pack = d3.pack()
    .size([mainview.width - 2, mainview.height - 2])
    .padding(3);
mainview.color = d3.scaleSequential(d3.interpolateMagma)
    .domain([-4, 5]);

/* Format and conversion  functions */
var displayDate = d3.timeFormat("%d/%m/%Y - %H:%M");
var fileSizeFormat = d3.format(",.1f");
var stratify = d3.stratify()
	.id(function(d){ return d.filename; })
    .parentId(function(d) {
		var parent = d.filename.substring(0, d.filename.lastIndexOf("/"));
		return (parent.length > 0 ? parent : (d.filename.length == 1 ? null : "/"));
	});

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
    // var root = buildTree(data); // From file dataTools.js

	var data2 = [];
	data.forEach(function(d){
		if(d.depth < 2){
			data2.push(d);
		}
	});

    var root = stratify(data2)
		.sum(function(d) { return d.size;})
		.sort(function(a, b) { return b.size - a.size; });

	pack(root);

    displayMainView(root);
    displayPathView(root);
}

function hovered(hover) {
	return function(d) {
	d3.selectAll(d.ancestors().map(function(d) { return d.node; })).classed("node--hover", hover);

	tooltip.classed('hidden', !hover);
	};
}

function displayTooltip(d){
	var mouse = d3.mouse(svgMainView.node()).map(function(d2) {
		return parseInt(d2);
	});
	tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 60 + mainview.width) + 'px; top:' + (mouse[1] + 70) + 'px')
        .html("<table>" +
			"<tr>" +
				"<td>" + (d.data.filetype == "d" ? "Dir" : "File") + "</td>" +
				"<td>" + d.data.filename + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Owner</td>" +
				"<td>" + d.data.owner + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Size</td>" +
				"<td>" + readableFileSize(d.data.size) + "</td>" +
			"</tr>" +
			"<tr>" +
				"<td>Date</td>" +
				"<td>" + displayDate(d.data.timestamp * 1000) + "</td>" +
			"</tr>" +
		"</table>");
}

/* Display functions */
function displayMainView(root) {
	var node = svgMainView.select("g")
		.selectAll("g")
		.data(root.descendants())
		.enter().append("g")
			.attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
			.each(function(d) { d.node = this; })
			.on("mouseover", hovered(true))
			.on("mouseout", hovered(false))
			.on("mousemove", displayTooltip)
			.on("click", function(d) { return zoom(node == d ? node : d); });

	node.append("circle")
		.attr("id", function(d) { return "node-" + d.filename; })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", function(d) { return d.r; })
		.style("fill", function(d) { return mainview.color(d.depth); });

	node.append("text")
			.attr("x", function(d) { return d.x })
			.attr("y", function(d) { return d.y })
			.text(function(d) { return d.data.filename; })
			.style("text-anchor", "middle");

	d3.select(window).on("click", function() { zoom(root); });
	zoom(root);

}

// Adapted from : http://mbostock.github.io/d3/talk/20111116/#10
function zoom(d, i) {
	var k = r / d.r / 2;
	x.domain([d.x - d.r, d.x + d.r]);
	y.domain([d.y - d.r, d.y + d.r]);

	var t = mainview.g.transition()
		.duration(500);

	t.selectAll("circle")
		.attr("cx", function(d) { return x(d.x); })
		.attr("cy", function(d) { return y(d.y); })
		.attr("r", function(d) { return k * d.r; });

	t.selectAll("text")
		.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y); })
		.style("opacity", function(d) { return k * d.r > 20 ? 1 : 0; });

	node = d;
	d3.event && d3.event.stopPropagation();
	displayPathView(d)
}

function getTextWidth(text, fontSize, fontFace) {
        var a = document.createElement('canvas');
        var b = a.getContext('2d');
        b.font = fontSize + 'px ' + fontFace;
        var mesure = b.measureText(text);
        return mesure.width;
}

function displayPathView(selectedNode) {
	var directory = selectedNode;
	var nodes = [];
	while(typeof directory != "undefined" && directory){
		nodes.push(directory);
		directory = directory.parent;
	}
	nodes.reverse();
	var trunk = pathview.g
		.select("g")
		.data(nodes);

	trunk.exit().remove();

	var enter = trunk.enter().append("g")
	/*enter.append("polygon")
		.attr("points", breadcrumbPoints)
		.style("fill", "lightgrey");*/

	/*enter.append("text")
		.attr("x", function(d, i){
			if(i != 0){
				return enter.data()[i - 1] +
			}

			return 10;
		})
		.attr("y", pathviewHeight - 20 )
		.style("font-size", 20)
		.attr("text-anchor", "left")
		.text(function(d) { return d.data.filename; });*/
}

init();
