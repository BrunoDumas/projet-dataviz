var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
	i = 0,
    duration = 750,
    g = svg.append("g").attr("transform", "translate(40,0)"),
	transform = d3.zoomIdentity;


var tree = d3.tree()
    .size([height, width]);

var stratify = d3.stratify()
	.id(function(d){ return d.filename; })
    .parentId(function(d) {
		var parent = d.filename.substring(0, d.filename.lastIndexOf("/"));
		return (parent.length > 0 ? parent : (d.filename.length == 1 ? null : "/"));
	});

d3.csv("outputfile.csv", function(error, data) {
  if (error) throw error;

  var data2 = [];
	data.forEach(function(d){
		if(d.depth <= 30 && d.filetype == "d"){
			data2.push(d);
		}
	});
	
    var root = stratify(data2)
		.sum(function(d) { return d.size; })
		.sort(function(a, b) { return b.size - a.size; });
	
	root.children.forEach(collapse);
	update(root);
	
	function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}
	
	    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }
function update(source) {
	
	var nodes = tree(root).descendants(),
		links = tree(root).descendants().slice(1);
		
		  // Normalize for fixed-depth.
  nodes.forEach(function(d){ d.y = d.depth * 180});
	
    var node = g.selectAll("g.node")
    .data(nodes, function(d) {return d.id || (d.id = ++i); });
	
	nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });
	
	
    var nodeEnter = node.enter().append("g")
      .attr("class", 'node')
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
	  .on('click', click);

  nodeEnter.append("circle")
	.attr('class', 'node')
    .attr("r", 1e-6)
	.style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#777";
      });

  nodeEnter.append("text")
      .attr("dy", ".35em")
      .attr("x", function(d) { return d.children ? -13 : 13; })
      .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
      .text(function(d) { return d.id.substring(d.id.lastIndexOf("/") + 1); });
	  
	  var nodeUpdate = nodeEnter.merge(node);
	  
	  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")";
     });
	 
	 nodeUpdate.select('circle.node')
    .attr('r', 10)
    .style("fill", function(d) {
        return d._children ? "lightsteelblue" : "#f00";
    })
    .attr('cursor', 'pointer');
	  
	  
	  
	  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();
	  
	  nodeExit.select('circle')
    .attr('r', 1e-6);
	
	  nodeExit.select('text')
    .style('fill-opacity', 1e-6);
	
	
	var link = g.selectAll("path.link")
    .data(links, function(d) { return d.id; });
	
	var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr("d", function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });
	  
	   var linkUpdate = linkEnter.merge(link);
	   
	   linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

	  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();
	  
  
    function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }
  
  function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    update(d);
  }
  
	
	  svg.call(d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", zoomed));

	function zoomed() {
		g.attr("transform", d3.event.transform);
	}
}
});
