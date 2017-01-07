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
        colorTypes: ["Owner", "File extension", "Depth", "Date"],
        colorType: "Owner",
        colorFiletype: d3.scaleOrdinal(d3.schemeCategory20),
        colorOwner: d3.scaleOrdinal(d3.schemeCategory10),
        colorDepth: d3.scaleQuantile().range(['rgb(194,230,153)','rgb(120,198,121)','rgb(49,163,84)','rgb(0,104,55)']),
        colorDate: d3.scaleLinear().range(['#ffffb2','#bd0026']),
        color: function(node){
            return function(){
                switch(mainview.colorType){
                    case "Owner":
                        return mainview.colorOwner(node.data.owner);
                        break;
                    case "File extension":
                        return mainview.colorFiletype("" + node.data.filetype + node.data.fileext);
                        break;
                    case "Date":
                        return mainview.colorDate(node.data.timestamp);
                        break;
                    default:
                        return mainview.colorDepth(node.depth);
                        break;
                }
            }
        },
		maxDepth: 4,
        viewFiles: true
	},
	r = Math.min(mainview.height, mainview.width),
	x = d3.scaleLinear().range([0, r]),
	y = d3.scaleLinear().range([0, r]),
    currNode,
	prevNode = {depth: 0};

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

var selectColorType = body
    .append('select')
        .attr('id','selectColorType')
        .attr('class','select')
        .style("top", margin.top)
        .style("left", displayArea.width * 2 - 100)
        .on('change', function() {
            mainview.colorType = d3.select('#selectColorType').property('value');
            refresh()
        });

selectColorType
    .selectAll('option')
    .data(mainview.colorTypes).enter()
    .append('option')
        .attr("id", function (d, i) { return i; })
        .text(function (d) { return d; });



var tooltip = d3.select('body').append('div')
	.attr('class', 'hidden tooltip');


var pack = d3.pack()
    .size([mainview.width - 2, mainview.height - 2])
    .padding(3);

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
	var owners = new Set();
    var maxDepth = 0;
    var minDate = Number.MAX_SAFE_INTEGER;
    var maxDate = 0;
	data.forEach(function(d){
		// Collect different file types + extensions
		types.add("" + d.filetype + d.fileext);
		owners.add(d.owner);
        maxDepth = (d.depth > maxDepth) ? d.depth : maxDepth;
        time = parseInt(d.timestamp)
        maxDate = (time > maxDate) ? parseInt(time) : maxDate;
        minDate = (time < minDate && time > 1451602800) ? time : minDate;

		if(d.depth <= mainview.maxDepth && ((mainview.viewFiles) ? true : (d.filetype == "d"))){
			data2.push(d);
		}
	});

	data2.sort(function(a, b) { return b.size - a.size; });
    var root = stratify(data2)
		.sum(function(d) { return d.size;})
		.sort(function(a, b) { return b.size - a.size; });

	pack(root);
	mainview.colorFiletype.domain( Array.from(types)).unknown('rgb(200, 200, 200)');
	mainview.colorOwner.domain( Array.from(owners)).unknown('rgb(200, 200, 200)');
	mainview.colorDepth.domain([0, maxDepth]);
	mainview.colorDate.domain([minDate, maxDate]);

    currNode = root;
    displayMainView(root);
    displayPathView(root);
}

function getFileName(node){
    var path = node.data.filename;
    var name = path.split("/");
    name = name[name.length - 1]
    return name.length > 0 ? name : "/";
}

function hovered(hover) {
	return function(d) {
		d3.selectAll(d.ancestors().map(function(d) { return d.node; })).classed("node--hover", hover);

		tooltip.classed('hidden', !hover);
	};
}

/* Display functions */
function refresh(){
    currNode && zoom(currNode) && displayPathView(currNode);
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
		.style("fill", function(d){ return mainview.color(d)() } )
        .style("stroke-width", function(d){ return Math.sqrt(Math.max(5 - d.depth, 0)) })
		.on("mouseover", hovered(true))
		.on("mouseout", hovered(false))
		.on("mousemove", displayTooltip)
		.on("click", function(d) { return zoom(node == d ? node : d); });

	/*node.append("text")
		.attr("x", function(d) { return d.x })
		.attr("y", function(d) { return d.y })
		.text(getFileName);
		})
		.attr("pointer-events", "none")
		.style("text-anchor", "middle")
		.classed("hidden", function(d){ return !d.children });*/

	//d3.select(window).on("click", function() { zoom(root); });
	zoom(root);

}

function degreeOfInterest(node){
    var distance = Math.abs(currNode.depth - node.depth);
    var currNodeParent = currNode.data.filename.slice(0, currNode.data.filename.lastIndexOf("/"));
    var nodeParent = node.data.filename.slice(0, node.data.filename.lastIndexOf("/"));
    var inheritance = (currNodeParent.includes(nodeParent)) ? -2 : 2;
    return distance + inheritance;
}

// Adapted from : http://mbostock.github.io/d3/talk/20111116/#10
function zoom(clickedNode, i) {
	var k = r / clickedNode.r / 2;
	x.domain([clickedNode.x - clickedNode.r, clickedNode.x + clickedNode.r]);
	y.domain([clickedNode.y - clickedNode.r, clickedNode.y + clickedNode.r]);


    currNode = clickedNode;
    mainview.g.selectAll("circle")
        .attr("class", function(d){ return (degreeOfInterest(d) >= 5) ? "hidden" : "" });

	var t = mainview.g.transition()
		.duration(0);

	t.selectAll("circle")
		.attr("cx", function(d) { return x(d.x); })
		.attr("cy", function(d) { return y(d.y); })
		.attr("r", function(d) { return k * d.r; })
		.style("fill", function(d){ return mainview.color(d)() } );

	/*t.selectAll("text")
		.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y); })
		.style("opacity", function(d) { return k * d.r > 20 ? 1 : 0; });*/

	node = clickedNode;
	d3.event && d3.event.stopPropagation();
	displayPathView(clickedNode)
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
		var width = getTextWidth(getFileName(d), pathview.fontSize, "arial") + pathview.fontSize / 2;
		var points = [];
		points.push("10,0");
		points.push(width + 10 + ",0");
		points.push(width + "," + pathview.fontSize);
		points.push(0 + "," + pathview.fontSize);
		return points.join(" ");
	}
	//var directory = (selectedNode.depth >= prevNode.depth) ? selectedNode : prevNode;
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
		.style("fill", function(d){ return mainview.color(d)() } )
		.attr("transform", "translate(-15," + -pathview.fontSize *0.55 + ")");

	enterNodes.append("text")
		.classed("pathText", true)
		.attr("y", pathviewHeight - pathview.fontSize - 8)
		.style("font-size", pathview.fontSize)
		.attr("text-anchor", "left")
		.attr("y", function(d, i){
			return pathview.height + pathview.fontSize / 10;
		})
		.text(getFileName);

	//var allNodes = pathview.g.selectAll(".pathPoly");
	var allTexts = trunk.select(".pathText");
	allTexts
		.attr("text-anchor", "left")
		.text(getFileName);
	trunk.select(".pathPoly")
		.attr("points", polygon)
		.style("fill", function(d){ return mainview.color(d)() } );

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
			offset += pathview.fontSize * 0.55 + getTextWidth(getFileName(nodes[j]), pathview.fontSize, "arial");
		}
		//var width = getTextWidth(trunk.data[i - 1].data.filename, 20, "arial") + 15;
    	return "translate(" + offset + ", 0)";
 	});

	prevNode = selectedNode;
}

init();
