function buildTree(data){

    var root;
    var prevNode;
    var prevDepth = 0;
    data.forEach(function(d){
        var depth = parseInt(d.depth);
        if(typeof root === "undefined"){ // First node (root)
            d.children = [];
            d.parent = undefined;
            root = d;
        } else { // Other nodes
            if(depth == prevDepth){ // Same depth (sibling)
                d.children = [];
                d.parent = prevNode.parent;
                prevNode.parent.children.push(d);
            } else if(depth == prevDepth + 1) { // More deep (child)
                d.children = [];
                d.parent = prevNode;
                prevNode.children.push(d);
            } else if(depth < prevDepth) { // More shallow (ancestor's sibling)
                d.children = [];
                d.parent = prevNode;

                // CLimb down
                while(d.parent.depth != depth - 1){
                    d.parent = d.parent.parent;
                }
                d.parent.children.push(d);
            } else {
                throw "A level is missing in the tree";
            }
        }
        prevNode = d;
        prevDepth = depth;
    });

    return root;
}
