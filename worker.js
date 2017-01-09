importScripts("https://d3js.org/d3.v4.min.js");

onmessage = function(event) {
    var root = event.data.root;

    unpackNode(root);
};

function unpackNode(root){
    var nextUnpackedNode = getNextUnpackedNode(root);
    if(nextUnpackedNode){
        processPack(nextUnpackedNode);
        postMessage({type: "unpacked", root: root});

        unpackNode(root);
    } else {
        postMessage({type: "end"});
    }
}

function getNextUnpackedNode(n){
    if(n.children){
        for(c in n.children){
            var chUnpack = getNextUnpackedNode(n.children[c]);
            if(chUnpack){
                return chUnpack;
            }
        }
    } else {
        if(n._children){
            return n;
        }
    }
}

function processPack(node){
    function shift(n, amount){
        n.x -= amount.x;
        n.y -= amount.y;
        if(n.children) {
            n.children.forEach(function(n0){shift(n0, amount)});
        }
    }

    if(node.children) {
        node.children.forEach(processPack);
    } else {
        if(node._children){
            node.children = node._children;
            node._children = null;

            node.children.forEach(unCollapse(node.depth));

            var prevPos = {r: node.r, x: node.x, y: node.y};
            var packThis = d3.pack()
                .size([node.r * 2, node.r * 2])
                .padding(3);
            packThis(node);
            node.r = prevPos.r;
            var prevPos = {x: node.x - prevPos.x, y: node.y - prevPos.y};
            shift(node, prevPos);
        }
    }
}

function unCollapse(startingDepth){
    return function(node){
        if(node._children) {
            if(node.depth - startingDepth <= 1) {
                node.children = node._children;
                node.children.forEach(unCollapse(startingDepth));
                node._children = null;
            }
        }
    };
}
