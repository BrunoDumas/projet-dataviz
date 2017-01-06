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
		fontSize: 45
	},
    overview = { // Tree view
		width: svgOverview.attr("width") - margin.left - margin.right,
		height: svgOverview.attr("height") - margin.top - margin.bottom,
		g: svgOverview.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	},
	mainview = { // Bubbles/Radial view
		width: svgMainView.attr("width") - margin.left - margin.right,
		height: svgMainView.attr("height") - margin.top - margin.bottom,
		g: svgMainView.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		maxDepth: 2
	},
	r = Math.min(mainview.height, mainview.width),
	x = d3.scaleLinear().range([0, r]),
	y = d3.scaleLinear().range([0, r]),
	prevnode = {depth: 0};

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

/*mainview.color = d3.scaleSequential(d3.interpolateMagma)
    .domain([-4, 5]);*/
mainview.color = d3.scaleOrdinal(d3.schemeCategory20);

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
			var category = Math.max(i-1, 0);
            return fileSizeFormat(aSize/def[category][0]) + ' ' + def[category][1];
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
	var types = new Set();
	data.forEach(function(d){
		// Collect different file types + extensions
		types.add("" + d.filetype + d.fileext);
		if(d.depth <= mainview.maxDepth /*&& d.filetype == "d"*/){
			data2.push(d);
		}
	});
	data2.sort(function(a, b) { return b.size - a.size; });

    var root = stratify(data2)
		.sum(function(d) { return d.size;})
		.sort(function(a, b) { return b.size - a.size; });

	pack(root);
	mainview.color.range( Array.from(types)).unknown('rgb(125, 125, 125)');

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
			.each(function(d) { d.node = this; });

	node.append("circle")
		.attr("id", function(d) { return "node-" + d.data.filename; })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", function(d) { return d.r; })
		.style("fill", function(d) { return mainview.color(""+d.data.filetype + d.data.fileext); })
		.on("mouseover", hovered(true))
		.on("mouseout", hovered(false))
		.on("mousemove", displayTooltip)
		.on("click", function(d) { return zoom(node == d ? node : d); });

	node.append("text")
		.attr("x", function(d) { return d.x })
		.attr("y", function(d) { return d.y })
		.text(function(d) {
			var path = d.data.filename;
			var name = path.split("/");
			name = name[name.length - 1]
			return name.length > 0 ? name : "/";
		})
		.attr("pointer-events", "none")
		.style("text-anchor", "middle")
		.classed("hidden", function(d){ return d.depth != mainview.maxDepth; });

	//d3.select(window).on("click", function() { zoom(root); });
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
	function polygon(d, i) {
		var width = getTextWidth(d.data.filename, pathview.fontSize, "arial") + pathview.fontSize / 2;
		var points = [];
		points.push("10,0");
		points.push(width + 10 + ",0");
		points.push(width + "," + pathview.fontSize);
		points.push(0 + "," + pathview.fontSize);
		return points.join(" ");
	}
	//var directory = (selectedNode.depth >= prevnode.depth) ? selectedNode : prevnode;
	var directory = selectedNode;
	var nodes = [];
	while(typeof directory != "undefined" && directory){
		nodes.push(directory);
		directory = directory.parent;
	}

	nodes.reverse();
	var trunk = pathview.g
		.selectAll("g")
		.data(nodes);

	trunk.exit().remove();

	var enterNodes = trunk.enter().append("g");

	enterNodes
		.classed("pathElement", true)
		.on("click", function(d) { return zoom(d); });

	enterNodes.append("polygon")
		.classed("pathPoly", true)
		.attr("points", polygon)
		.style("fill", function(d){ return mainview.color("" + d.data.filetype + d.data.fileext) })
		.attr("transform", "translate(-15," + -pathview.fontSize *0.55 + ")");

	enterNodes.append("text")
		.classed("pathText", true)
		.attr("y", pathviewHeight - pathview.fontSize - 8)
		.style("font-size", pathview.fontSize)
		.attr("text-anchor", "left")
		.attr("y", function(d, i){
			return pathview.height + pathview.fontSize / 10;
		})
		.text(function(d) {
			var path = d.data.filename;
			var name = path.split("/");
			name = name[name.length - 1]
			return name.length > 0 ? name : "/";
		});

	//var allNodes = pathview.g.selectAll(".pathPoly");
	var allTexts = trunk.select(".pathText");
	allTexts
		.attr("text-anchor", "left")
		.text(function(d) {
			var path = d.data.filename;
			var name = path.split("/");
			name = name[name.length - 1]
			return name.length > 0 ? name : "/";
		});
	trunk.select(".pathPoly")
		.attr("points", polygon);

	/*trunk.attr("transform", function(d, i) {
		var offset = 0;
		for(var j = i - 1; j >= 0; j--){
			offset += 15 + getTextWidth(nodes[j].data.filename, pathview.fontSize, "arial");
		}
		//var width = getTextWidth(trunk.data[i - 1].data.filename, 20, "arial") + 15;
    	return "translate(" + offset + ", 0)";
 	});*/

	pathview.g
		.selectAll("g").attr("transform", function(d, i) {
		var offset = 0;
		for(var j = i - 1; j >= 0; j--){
			offset += pathview.fontSize * 0.55 + getTextWidth(nodes[j].data.filename, pathview.fontSize, "arial");
		}
		//var width = getTextWidth(trunk.data[i - 1].data.filename, 20, "arial") + 15;
    	return "translate(" + offset + ", 0)";
 	});

	prevnode = selectedNode;
}

init();
