/* Display setup */
var displayArea = {width: 960, height: 500},
	pathviewHeight = 50,
	margin = {top: 20, right: 20, bottom: 20, left: 20},
	r = displayArea.height * 0.9,
	x = d3.scaleLinear().range([0, r]),
  y = d3.scaleLinear().range([0, r]),
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
mainview.g.append("rect").attr("x", -margin.left).attr("y",  -margin.top).attr("width", mainview.width + margin.right + margin.left).attr("height", mainview.height + margin.top + margin.bottom).style("fill", "white").style("stroke", "black")

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
		.sum(function(d) { return d.size; })
		.sort(function(a, b) { return b.size - a.size; });

	pack(root);

    displayTree(root);
}

function hovered(hover) {
  return function(d) {
    d3.selectAll(d.ancestors().map(function(d) { return d.node; })).classed("node--hover", hover);
  };
}

/* Display functions */
function displayTree(root) {
	var node = svgMainView.select("g")
		.selectAll("g")
		.data(root.descendants())
		.enter().append("g")
			//.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
			.attr("class", function(d) { return "node" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
			.each(function(d) { d.node = this; })
			.on("mouseover", hovered(true))
			.on("mouseout", hovered(false))
			.on("click", function(d) { return zoom(node == d ? node : d); });

	node.append("circle")
		.attr("id", function(d) { return "node-" + d.filename; })
		.attr("cx", function(d) { return d.x; })
		.attr("cy", function(d) { return d.y; })
		.attr("r", function(d) { return d.r; })
		.style("fill", function(d) { return mainview.color(d.depth); });

	var leaf = node.filter(function(d) { return !d.children; });

	leaf.append("clipPath")
			.attr("id", function(d) { return "clip-" + d.filename; })
		.append("use")
			.attr("xlink:href", function(d) { return "#node-" + d.filename + ""; });

	leaf.append("text")
			.attr("clip-path", function(d) { return "url(#clip-" + d.filename + ")"; })
		.selectAll("tspan")
		.data(function(d) { return d.data.filename.substring(d.data.filename.lastIndexOf(".") + 1).split(/(?=[A-Z][^A-Z])/g); })
		.enter().append("tspan")
			.attr("x", 0)
			.attr("y", function(d, i, nodes) { return 13 + (i - nodes.length / 2 - 0.5) * 10; })
			.text(function(d) { return d; });

	node.append("title")
		.text(function(d) { return d.filename + "\n" + readableFileSize(d.size); });

	d3.select(window).on("click", function() { zoom(root); });

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

// Adapted from : http://mbostock.github.io/d3/talk/20111116/#10
function zoom(d, i) {
  var k = r / d.r / 2;
  x.domain([d.x - d.r, d.x + d.r]);
  y.domain([d.y - d.r, d.y + d.r]);

  var t = svgMainView.transition()
      .duration(d3.event.altKey ? 7500 : 750);

  t.selectAll("circle")
      .attr("cx", function(d) { return x(d.x); })
      .attr("cy", function(d) { return y(d.y); })
      .attr("r", function(d) { return k * d.r; });

  t.selectAll("title")
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y); })
      .style("opacity", function(d) { return k * d.r > 20 ? 1 : 0; });

  node = d;
  d3.event.stopPropagation();
}



init();
