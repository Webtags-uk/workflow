$( document ).ready(function() {	
	
function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}	
		
// initialise graphit	
initPageObjects();



// load for pdf
if (workflow = getParameterByName("workflow")){
	var wf = JSON.parse(workflow);
	loadWorkflowsPDF(wf);
}

var nodeCount=0; workAreaCount=$('.workArea').length;


	
///toggle panels
$(".ipanel-toggle").click(function() {
	$(this).parent(".ipanel").find(".ipanel-content:first").slideToggle("fast");
})

$(".ipanel-close").click(function() {
	$(this).parent(".ipanel").slideUp("fast", function() {
		tidyMenu();
	});
})

///toggle categories
$(".cat-toggle").on("click", function(e) {
	e.preventDefault();
	var id=$(this).attr("data-target");
	$("#"+id).slideDown("fast");
	tidyMenu();
});

///toggle toolsets based on profile
$(".load-tools").click(function(e) {
	e.preventDefault();
	
	$("#controls .icat").hide();
	var profile=$(this).attr("data-profile");
	
	if (profile=="guidedMapping"){
		clearAllWorkflows();
		addWorkArea();
		$("#controls #questions, #controls #pallets").slideDown("fast");
	}
	if (profile=="freehandMapping"){
		$("#controls #templates, #controls #pallets").slideDown("fast");
	}
	if (profile=="samples"){
		$("#controls #templates").slideDown("fast");
	}
	
	tidyMenu();
})

// to remove 'end' class on right menu for styling dividers
function tidyMenu() {
	$("#controls .ipanel").removeClass('end');
	$("#controls .ipanel:visible:last").addClass('end');
}

///temporary variables to emulate saving to db
var savedWorkflows, savedSketches, savedSketch;

var sketches = [];

if(!savedWorkflows){
	$("#load-saved-workflow, #load-saved-project").hide();
}

$(".new-project").click(function(e) {
	e.preventDefault();
	newProject();
})


$(".new-workArea").click(function(e) {
	e.preventDefault();
	addWorkArea();
})

function addWorkArea(){
	workAreaCount ++;
	var workAreaId = "flow"+ workAreaCount;
	var name =	"Unnamed flow "+workAreaCount;
	var item = $('<div class="workArea" data-name="'+name+'" data-public="false" id="'+workAreaId+'"><div class="drawArea"><canvas id="'+workAreaId+'-sketch" class="colors_sketch" width="1600" height="1200"></canvas><img class="saved-image" /></div><div id="'+workAreaId+'-canvas" class="dragArea canvas"></div></div>');
	var tab = $('<li><a href="#" data-target="'+workAreaId+'">'+name+'</a></li>');
	
	$('#workAreaWrapper').append(item);
	$('#flowTabs').append(tab);
	
	makeWorkAreaActive(workAreaId);
	
	initPageObjects();
	var thisSketch = $(item).find("canvas.colors_sketch").sketch();
	sketches.push(thisSketch);
	
	$(item).find('.dragArea').on('drop', function(e){
		doDrop(e);
	});
	
	$(item).find('.dragArea').on('dragover', function(e) { 
		e.preventDefault();
		e.stopPropagation();
	});

	$(item).find('.dragArea').on('dragenter', function(e) {
		e.preventDefault();
		e.stopPropagation();
	});
	
	return workAreaId;
}

$(".remove-workArea").click(function(e) {
	e.preventDefault();
	removeWorkArea();
})

function removeWorkArea(workAreaId){
	// check if workAreaId has been specified and get active otherwise
	thisWorkAreaId = (typeof workAreaId !== "undefined") ? workAreaId : $('.workArea.active').prop('id');
	// get specified workarea dom element
	thisWorkArea = $('#workAreaWrapper').find('#'+thisWorkAreaId);
	// get associated tab
	thisTab = $('#flowTabs a[data-target="'+thisWorkAreaId+'"]').parent("li");

	// make sure not only workarea 
	if($('#workAreaWrapper > .workArea').length > 1) {
		// if first tab, then make next tab active else, previous tab
		var nextActive = (typeof thisTab.prev()[0] !== "undefined") ? thisWorkArea.prev()[0].id : thisWorkArea.next()[0].id;
		makeWorkAreaActive(nextActive);
	}

	// remove specified workarea and tab
	$('#workAreaWrapper').find('#'+thisWorkAreaId).remove();
	thisTab.remove();

	// removed specified workarea's canvas and sketch
	for(i = 0; i < canvases.length; i++) {
		if(canvases[i].id == thisWorkAreaId+'-canvas') {
			canvases.splice(i, 1);
			sketches.splice(i, 1);
		}
	}
}

$(".load-template").click(function() { 
	var url = $(this).attr("data-template");
	$.get("ajax/"+url, function(data) {
	  var workflow = JSON.parse(data).workflow;
		clearActiveWorkflow();
		// get current work area wrapper for namespacing nodes
		var canvasId = $('.workArea.active .canvas').prop('id');
		loadWorkflow(workflow.data, canvasId )
	});
});

$("#load-saved-project").click(function() {
	clearAllWorkflows();
	if(savedWorkflows.length>0){ 
		loadWorkflows(savedWorkflows);
	}
	if(!!savedSketch){
		loadSketches(savedSketches);
	}
});

function newProject(){
	clearAllWorkflows();
	addWorkArea();
}

function clearAllWorkflows(){
	// select all elements in every dragArea and remove
	$(".dragArea .node, .dragArea .connector, .dragArea .connector, .dragArea .connector-graphit, .dragArea .connector-end, .dragArea .destination-label, .dragArea .calc, .dragArea .caption").remove();
		
	// reset graph-it by emptying canvas object arrays
	var i;
	for(i = 0; i < canvases.length; i++) {
		canvases[i].blocks=[];
		canvases[i].connectors=[];
	}
	canvases = [];
	sketches = [];

	$(".workArea").each( function(){
		var workAreaId = $(this).attr("id");
		removeWorkArea(workAreaId);
	});
}

function clearActiveWorkflow(){
	// get active dragArea canvas
	currentWorkflow = $('.workArea.active > .dragArea');
	// select all elements on dragArea and delete
	currentWorkflow.find('.node, .connector, .connector-graphit, .connector-end, .destination-label, .calc, .caption').remove();
	// get id of current dragArea and empty related object array
	var canvas = findCanvas($('.workArea.active > .dragArea').prop('id'));
	canvas.blocks=[];
	canvas.connectors=[];
}

// delete on keypress
$('html').keyup(function(e){ if(e.keyCode == 46) { 
	// make sure input field is not being typing into
	if(!$('input:focus').length)
		deleteActiveElements();
	}
});
// delete on main trash button press
$('.trash').click(function(){ deleteActiveElements(); });

function deleteActiveElements(){
	if (($(".active-node").length>0)||($(".selected-connector").length>0)){
		deleteNodeAndConnectors();
		clearNodeData();
	}
	if ($(".active-calc").length>0){ 
		$(".active-calc").remove();
		clearCalcData();
	}
	if ($(".active-caption").length>0){ 
		$(".active-caption").remove();
	}
}

function deleteNodeAndConnectors(nodeId) {
	// if nodeId is already known
	nodeId = (typeof nodeId === 'undefined') ? $(".active-node").attr("id") : nodeId;

	// previously: if(nodeId = $(".active-node").attr("id")) {
	// if is node rather than connector
	if(nodeId) {
		
		$("."+nodeId).each(function( index ) {
			var connectorId = $(this).attr("class");
			deleteConnector(connectorId);
		})
		  
		deleteNode(nodeId);
		//deleteNodeAndConnectors(nodeId);
	}
	// if is only connector
	else if($(".selected-connector").length) {
		//if at least one selected connector then find classes belonging to it
		var connectorId = $(".selected-connector").attr("class");
		//only need classes relating to node names block_1 etc
		var splitted = connectorId.split(' ');		
		
		elsToDelete = '.' + splitted[1] + '.' + splitted[2];

		$(elsToDelete).each(function( index ) {
			$(this).removeClass("selected-connector");
			deleteConnector($(this).attr("class"));
		});
	}
}

function deleteNode(id){
	$("#"+id).remove();
	var canvas = findCanvas($('.workArea.active > .dragArea').prop('id'));
	for(i=0; i<canvas.blocks.length; i++){
		if (canvas.blocks[i].id==id){
			canvas.blocks.splice(i,1);
		}
	}
}

function deleteConnector(id){
	var cssSelector=id.replace(/\s+/g, '.');
	
	$("."+cssSelector).remove();
	var canvas = findCanvas($('.workArea.active > .dragArea').prop('id'));

	for(i=0; i<canvas.connectors.length; i++){
		
		if (canvas.connectors[i].id==id){
			canvas.connectors.splice(i,1);
		}
	}
}

function loadSketches(sketches){
	for(var i=0; i<sketches.length; i++) {
		// each existing canvas gets sketch based on index
		loadSketch(sketches[i], $(".drawArea")[i]);
	}
}


function loadSketch(sketch, drawarea){
	thisDrawArea = (typeof drawarea !== "undefined") ? drawarea : $('.workArea.active .drawArea');
	// get current workArea sketch image
	var image = $(thisDrawArea).find('.saved-image')[0];
	// load saved sketch into image
	image.src = sketch;
	// onload, initialise active canvas and redraw image onto it
	image.onload = function() {
		var can = (typeof drawarea !== "undefined") ? $(drawarea).find('canvas.colors_sketch')[0] : $('.drawArea:visible').find('canvas.colors_sketch')[0];
		var ctx = can.getContext('2d');
		ctx.drawImage(image,0,0);
	}	
}

function loadWorkflows(workflows){
	for(var i=0; i<workflows.length; i++){
		var workAreaId = addWorkArea();
		var canvasId = workAreaId+"-canvas";
		var workflow=workflows[i].workflow
		
		setWorkflowMetaData(workAreaId, workflow.name, workflow.public);
		loadWorkflow(workflow.data, canvasId);
	}
}


function loadWorkflowsPDF(workflows){
	var offset=0
	var workAreaId = "flow1";
	for(var i=0; i<workflows.length; i++){
		var canvasId = workAreaId+"-canvas";
		var workflow=workflows[i].workflow;
		loadWorkflow(workflow.data, canvasId, offset);
		offset +=getMaxTop(workflow.data) + 100;
	}
}

function getMaxTop(workflow){
	var maxTop=0;
	for (var i=0; i<workflow.length; i++){
		var item=workflow[i];
		if (item.iTop>maxTop){
			maxTop=item.iTop;
		}
	}
	console.log(maxTop)
	return maxTop;
}


function loadWorkflow(workflow, canvasId, offset){
	offset = offset || 0;
	// add nodes and connectors
	for (var i=0; i<workflow.length; i++){
		var item=workflow[i];
		if (item.iType=="node"){
			addGraphitNode(item.iClass, item.iCaption, item.iTooltip, item.iTimerDisplay, item.iTime, item.iTop + offset, item.iLeft, item.iId+canvasId, canvasId);
		}
		if (item.iType=="connector"){
			addGraphitConnector(item.id1+canvasId, item.id2+canvasId);
		}
		if (item.iType=="calculator"){
			addCalc(item.iMinwage, item.iMins, item.iTop + offset, item.iLeft, item.iSaving)
		}
		if (item.iType=="caption"){
			addCaption(item.iCaption, item.iTop + offset, item.iLeft )
		}
	}
}

// Actually save project action
$(".save-project").click(function(e) {
	e.preventDefault();
	
	savedWorkflows=extractAllWorkflows();
	savedSketches=[];
	
	$('canvas.colors_sketch').each(function(){
		// traverse each drawArea canvas, save as data then add to array
		savedSketches.push(saveSketch($(this)[0]));
	});

	// to do add to list of saved workflows
	$("#load-saved-project").show();
});

function saveSketch(canvas){
	// if no canvas selected, get active canvas
	var currentCanvas = (typeof canvas !== "undefined") ? canvas : $('#'+$('.workArea.active').prop('id')+'-sketch')[0];
	// save image data to variable;
	savedSketch = currentCanvas.toDataURL();

	return savedSketch;
}

function extractAllWorkflows(){
	var workflows=[]
	$(".canvas").each(function(){
	    var wfId=$(this).attr("id");
		var wf = extractWorkflow(wfId);
		var wfObj={"workflow": wf};
		workflows.push(wfObj);
	});
	return workflows;
}
function extractWorkflow(canvasId){
	
	var workflow={};
	workflow.data=[];
	//get nodes from dom
	$("#" + canvasId + " .node").each(function( index, value ) {
		var item={}
		var left=parseInt($(value).attr("data-x"), 10) || 0;
		var top=parseInt($(value).attr("data-y"), 10) || 0;
		left +=(parseInt($(value).css('left'), 10) || 0);
		top +=(parseInt($(value).css('top'), 10) || 0);
		
		item["iId"]= $(value).attr("id");
		item["iType"]="node";
		item["iClass"]= $(value).find("span.icon").attr("class");
		item["iCaption"]= $(value).find(".text").text();
		item["iTooltip"]= $(value).find(".tooltip").text();
		item["iTop"]= top;
		item["iLeft"]= left;
		item["iTimerDisplay"]= $(value).find(".time").css('display');
		item["iTime"]= $(value).find(".time").text();
		workflow.data.push(item)
	});
	
	$("#" + canvasId + " .calc").each(function( index, value ) {
		var item={}
		var left=parseInt($(value).attr("data-x"), 10) || 0;
		var top=parseInt($(value).attr("data-y"), 10) || 0;
		left +=(parseInt($(value).css('left'), 10) || 0);
		top +=(parseInt($(value).css('top'), 10) || 0);
		
		item["iId"]= $(value).attr("id");
		item["iType"]="calculator";
		item["iMinwage"]= $(value).attr("data-minwage");
		item["iMins"]= $(value).find(".mins").text();
		item["iSaving"]= $(value).find(".saving").text();
		item["iTop"]= top;
		item["iLeft"]= left;	
		workflow.data.push(item);

		
	})
	
	$("#" + canvasId + " .caption").each(function( index, value ) {
		var item={}
		var left=parseInt($(value).attr("data-x"), 10) || 0;
		var top=parseInt($(value).attr("data-y"), 10) || 0;
		left +=(parseInt($(value).css('left'), 10) || 0);
		top +=(parseInt($(value).css('top'), 10) || 0);
		
		item["iId"]= $(value).attr("id");
		item["iType"]="caption";
		item["iCaption"]= $(value).find(".text").text();
		item["iTop"]= top;
		item["iLeft"]= left;	
		workflow.data.push(item);

		
	})

	
	//get connectors from graph-it
	
	var canvas = findCanvas(canvasId);
	
	//var canvas = findCanvas($('.workArea.active > .dragArea').prop('id'));
	for (i=0; i<canvas.connectors.length; i++){
		var item={};
		var id=canvas.connectors[i].id;
		idArray=id.split(" ");
		
		item["iType"]="connector";
		item["id1"]=idArray[1];
		item["id2"]=idArray[2];
		workflow.data.push(item);
	};
	
	
	 var workArea=$("#" + canvasId).parents(".workArea")
	 workflow.name=$(workArea).attr("data-name")
	 workflow.public=$(workArea).attr("data-public")
	 
	console.log(JSON.stringify(workflow))
	return workflow;
	
}

 //add a node or connector to top of canvas on click
$('.add').click(function(){

	var offSet = 10;
	var numNewElements = $('.node.new').length;

	initLeft = 30 + numNewElements*offSet*3;
	initTop = 30 + numNewElements*offSet;

	var iType=$(this).attr("data-type");
	if(iType=="node"){
		var iClass=$(this).attr("data-class");
		var iCaption=$(this).attr("data-caption");
		var iTooltip=$(this).attr("data-tooltip");
		addNode( iClass, iCaption, iTooltip, 30, 30);
	}
	if(iType=="connector"){
		var direction = $(this).attr("data-direction");
		addConnector( direction, 30, 30, 50, 50); 
	}
	
	
	
	if(iType=="connected-node"){
		var iClass=$(this).attr("data-class");
		var iCaption=$(this).attr("data-caption");
		var iTooltip=$(this).attr("data-tooltip");
		addConnectedNode( iClass, iCaption, iTooltip, 30, 30);
	}
	
	if(iType=="graphit-node"){
		
		var iClass=$(this).attr("data-class");
		var iCaption=$(this).attr("data-caption");
		var iTooltip=$(this).attr("data-tooltip");
		addGraphitNode(iClass, iCaption, iTooltip, "", "", initTop, initLeft);
	}
	
	
	if(iType=="guided-node"){
		
		var iId=$(this).attr("data-id");
		var iClass=$(this).attr("data-class"); 
		var iCaption=$(this).attr("data-caption");
		var iTooltip=$(this).attr("data-tooltip");
		var iTop=$(this).attr("data-top");
		var iLeft=$(this).attr("data-left");
		
		
		// if this node exists just swap the data else create it
		thisNode = $(".workArea.active > .dragArea ." +iId);
		
		if (thisNode.length>0) {
			swapNode(iClass, iCaption,  iTooltip, thisNode)	
		}
		else {
			deleteNodeAndConnectors(iId);
			addGraphitNode( iClass, iCaption, iTooltip, "", "", iTop, iLeft, iId);
			
			var nodeWidth=100;
			var nodeHeight=100;
			var conLength=30;
			var conWidth=15;
			
			var connector = $(this).attr("data-connector");
			
		
			
			if (connector!="none"){
				ids=connector.split(" ");
				addGraphitConnector(ids[0], ids[1]);
				
			}

			$(this).closest('.ipanel').next().show();
		}
	}
	
	if(iType=="calc"){
		var iMinWage=$(this).attr("data-minwage"); 
		var iMins=$(this).attr("data-mins");
		addCalc(iMinWage, iMins, 50, 0);
	}
	
	if(iType=="caption"){
		var iCaption=$(this).attr("data-caption");
		addCaption(iCaption, 50, 0);
	}
	
})

//swap node
function swapNode(iClass, iCaption, iTooltip, node){ 
	$(node).find(".icon").attr("class", "icon " + iClass);
	$(node).find(".text").text( iCaption);
} 

//add node
function addNode(iClass, iCaption,  iTooltip, iTop, iLeft, iId){
	iId=iId || "";
	var item = $('<div  class="node draggable '+iId+'"><span data-toggle="tooltip" data-placement="top"  title="'+ iTooltip +'" class="icon '+iClass+'"></span><p class="text"> '+ iCaption +' </p>   </div>');
	
	 $(item).find('[data-toggle="tooltip"]').tooltip();
	$('#dragArea').append(item);
	item.css( "top", iTop+"px");
	item.css( "left", iLeft+"px");
}

function addGraphitNode(iClass, iCaption,  iTooltip, iTimerDisplay, iTime, iTop, iLeft, iId, canvasId){ 
	nodeCount++;
	iId =iId || "node"+nodeCount.toString();
	canvasId = canvasId ||   $('.workArea.active .canvas').prop('id');
	nodeID=iId;
	// create node item

	var item = $('<div id="'+nodeID+'" class="node block draggable-graphit new '+nodeID+'"><span title="Time required" class="glyphicon glyphicon-time time">'+iTime+'</span><span data-toggle="tooltip" data-placement="top"  title="'+ iTooltip +'" class="icon '+iClass+'"></span><p class="text">' + iCaption + '</p></div>');
		
	$(item).find('[data-toggle="tooltip"]').tooltip();
	//console.log(iTimerDisplay)
	$(item).find('.time').css("display",iTimerDisplay );
	$('#'+canvasId).append(item);
	item.css( "top", iTop+"px");
	item.css( "left", iLeft+"px");
			
	var element = document.getElementById(nodeID);
	//var activeWorkflow = $('.workArea.active > .dragArea').prop('id');
	
	var canvas = findCanvas(canvasId); 
	var newBlock = new Block(element, canvas);
	newBlock.initBlock();
	canvas.blocks.push(newBlock);
				
	$('#'+nodeID).on('click touchstart', function(){
		makeActive(this);
		connectToActiveNode(this);
	});

	
		
}

function addGraphitConnector(id1, id2){
																																																						
	if ($('.connector-graphit.'+id1+'.'+ id2).length==0) {
	
		var newdiv = document.createElement('div');
		newdiv.setAttribute('class','connector-graphit '+id1+' '+ id2);

		var newlabel = document.createElement('label');
		newlabel.setAttribute('class','destination-label ' +id1+' '+ id2);

		var newarrow = document.createElement('img');
		newarrow.setAttribute('class','connector-end ' +id1+' '+ id2);
		newarrow.setAttribute('src','images/arrow.png');
		newarrow.setAttribute('width','7');
		newarrow.setAttribute('height','7');

		newdiv.appendChild(newlabel);
		newdiv.appendChild(newarrow);

		var activeWorkflow = $('.workArea.active > .dragArea')[0];	
		activeWorkflow.appendChild(newdiv);
		var canvas = findCanvas(activeWorkflow.id); 
		var newConnector = new Connector(newdiv, canvas);
		newConnector.initConnector();
		canvas.connectors.push(newConnector);

		$(newlabel).on('click touchstart', function(){
			classes = this.dataset.parent;
				
			$('.connector-graphit').each(function() {
				$(this).removeClass('selected-connector');
				if($(this).hasClass(classes))
					$(this).addClass('selected-connector');
				}
			);
		});

		return true;
	}

	return false;
}


function addCalc(iMinwage, iMins, iTop, iLeft, iSaving){ 

		nodeCount++;
		iId ="calc"+nodeCount.toString();
		iSaving=iSaving || 0;
		
		var item = $('<div id="'+iId+'" class="calc draggable" data-minwage="'+ iMinwage +'"><h5> Benefits </h5> <p>mins saved: <span class="mins">'+ iMins+'</span><p> <p>annual saving: $<span class="saving">'+ iSaving +'</span><p></div>');
		$('.workArea.active > .dragArea').append(item);
		item.css( "top", iTop+"px");
		item.css( "left", iLeft+"px");
		
}


function addCaption(iCaption,  iTop, iLeft){ 

		nodeCount++;
		iId ="cap"+nodeCount.toString();
		
		
		var item = $('<div id="'+iId+'" class="caption draggable" ><h5 class="text">'+ iCaption +'</h5> </div>');
		$('.workArea.active > .dragArea').append(item);
		item.css( "top", iTop+"px");
		item.css( "left", iLeft+"px");
		
}

// graphit connector utilities

$(".destination-label").on('click touchstart', function() {
	classes = this.dataset.parent
	

	$('.connector-graphit').each(function() {
		$(this).removeClass('selected-connector');
		if($(this).hasClass(classes))
			$(this).addClass('selected-connector');
		}
	);
});

// graphit node utility
$(".node ").on('click touchstart',function() {	
	makeActive(event.target);
	connectToActiveNode(event.target);
})

function makeActive(elem){ 
	node = $(elem).hasClass("node") ? $(elem) : $(event.target).parents(".node");

	if ($(node).hasClass("dragged")){		
		$(node).removeClass("dragged");
		$(node).removeClass("active-node");
		clearNodeData();
	}
	else {		
		$(node).addClass("active-node");
		$("#nodedata").slideDown();
		tidyMenu();
		loadNodeData(node);		
	}
}

function connectToActiveNode(elem){
	// gets node from direct click or child click
	node = $(elem).hasClass("node") ? $(elem) : $(event.target).parents(".node");
	// current node become the end
	endNodeId=node.attr("id");
	
	// to find any other selected nodes
	var beginNodeId;
	var activeNodes=$(".active-node");
	for(i=0; i<activeNodes.length; i++){
		var id= $(activeNodes[i]).attr("id");
		if(id != endNodeId){
			// if found, other node becomes beginning
			beginNodeId=id;
		}
	}
		
	// if there are two different nodes selected...	
	if(!!beginNodeId && !!endNodeId){
		// test if already connected and connected
		if(addGraphitConnector(beginNodeId, endNodeId)){
			$(".node").removeClass("active-node");
			clearNodeData();
		}
		// deselect previous node if already connected
		else
			$('#'+beginNodeId).removeClass("active-node");
	}
	
}

//add node
function addConnectedNode(iClass, iCaption,  iTooltip, iTop, iLeft, iId){
		iId=iId || "";
		var item = $('<div  class="node draggable '+iId+'"><span  data-toggle="tooltip" data-placement="top"  title="'+ iTooltip +'" class="icon '+iClass+'"></span><p class="text"> '+ iCaption +' </p></div>');
		
		var upcon=$('<div data-direction="up" class="connector resize-nodrag up" style="width: 30px; height: 30px; bottom: 90px; left: 35px;"></div>');
		var downcon=$('<div data-direction="down" class="connector resize-nodrag down" style="width: 30px; height: 30px; top: 90px; left: 35px;"></div>');
		var rightcon=$('<div data-direction="right" class="connector resize-nodrag right" style="width: 30px; height: 30px; top: 35px; left: 90px;"></div>');
		var leftcon=$('<div data-direction="left" class="connector resize-nodrag left" style="width: 30px; height: 30px; top: 35px; right: 90px;"></div>');
		$(item).append(upcon);
		$(item).append(downcon);
		$(item).append(rightcon);
		$(item).append(leftcon);
		$(item).find('[data-toggle="tooltip"]').tooltip();
		
		$('.workArea.active > .dragArea').append(item);
		item.css( "top", iTop+"px");
		item.css( "left", iLeft+"px");
}

//add connector
function addConnector(iDirection, iWidth, iHeight, iTop, iLeft, iId){
	iId=iId || "";
	var item = $('<div data-direction="'+iDirection+'" class="connector resize-drag '+iDirection+' '+iId+'"></div>');
	$('.workArea.active > .dragArea').append(item);
	item.css( "width", iWidth+"px");
	item.css( "height", iHeight+"px");
	item.css( "top", iTop+"px");
	item.css( "left", iLeft+"px");
}

// code for '.draggin' elements - eg menu items
$('.dragIn').on('dragstart', function(e) { 
	
	//test=e.originalEvent.offsetX
	//test=e.targetTouches[0]
		var data={};
		//var el=e.originalEvent.target
		var el=this;
		var iType=$(el).attr("data-type")
		if (iType=="node"){
			data.iType=iType;
			data.iClass=$(el).attr("data-class");
			data.iCaption=$(el).attr("data-caption");
			data.iTooltip=$(el).attr("data-tooltip");
		}
		if (iType=="graphit-node"){
			data.iType=iType;
			data.iClass=$(el).attr("data-class");
			data.iCaption=$(el).attr("data-caption");
			data.iTooltip=$(el).attr("data-tooltip");
		}
		if (iType=="connector"){
			data.iType=iType;
			data.iDirection=$(el).attr("data-direction");
		}
		if (iType=="connected-node"){
			data.iType=iType;
			data.iClass=$(el).attr("data-class");
			data.iCaption=$(el).attr("data-caption");
			data.iTooltip=$(el).attr("data-tooltip");
		}
		//e.originalEvent.dataTransfer.setData("text", e.target.id);
		
		if (iType=="calc"){
			data.iType=iType;
			data.iMinwage=$(el).attr("data-minwage");
			data.iMins=$(el).attr("data-mins");
		}
		
		if (iType=="caption"){
			data.iType=iType;
			data.iCaption=$(el).attr("data-caption");
		}
		
		e.originalEvent.dataTransfer.setData("text", JSON.stringify(data));
		//e.dataTransfer.setData("data", JSON.stringify(data));
    }
)




$('.dragArea').on('dragover', function(e) { 
    e.preventDefault();
    e.stopPropagation();
});

$('.dragArea').on('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
});


function objToString (obj) {
    var str = '';
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + '::' + obj[p] + '\n';
        }
    }
    return str;
}


$('.dragArea').on(
    'drop',
    function(e){
		doDrop(e);
});
 
 
 function doDrop(e){
	

	
	var offset=$(".workArea.active > .dragArea").offset()
	var x, y;
	if(!!e.pageX){
	//mouse
		x=e.pageX - offset.left
		y=e.pageY - offset.top
	}else{
	//touch
		x=e.offsetX - offset.left + $(document).scrollLeft();
		y=e.offsetY - offset.top + $(document).scrollTop();
	}
					
	var data = JSON.parse(e.originalEvent.dataTransfer.getData("text"));

	if(data.iType=="node"){
		var xoffset=-50;
		var yoffset=-50;
		addNode(data.iClass, data.iCaption, data.iTooltip, y+yoffset, x+xoffset);
	}
	
	if(data.iType=="graphit-node"){ 
		var xoffset=-50;
		var yoffset=-50;
		addGraphitNode(data.iClass, data.iCaption, data.iTooltip, "", "", y+yoffset, x+xoffset);
	}
		
		
	if(data.iType=="connector"){
		var xoffset=0;
		var yoffset=0;
		var iDirection= data.iDirection
		if(iDirection=="up"){xoffset=-15;yoffset=-30;}
		if(iDirection=="down"){xoffset=-15}
		if(iDirection=="left"){yoffset=-15; xoffset=-30}
		if(iDirection=="right"){yoffset=-15}
		addConnector( iDirection, 30, 30, y+yoffset, x+xoffset); 
	}

	if(data.iType=="connected-node"){
		var xoffset=-50;
		var yoffset=-50;
		addConnectedNode(data.iClass, data.iCaption, data.iTooltip, y+yoffset, x+xoffset);
	}
	
	
	if(data.iType=="calc"){ 
		var xoffset=-50;
		var yoffset=-50;
		addCalc(data.iMinwage, data.iMins, y+yoffset, x+xoffset);
	}
	
	if(data.iType=="caption"){ 
		var xoffset=-50;
		var yoffset=-50;
		addCaption(data.iCaption, y+yoffset, x+xoffset);
	}
		
}

 
//INTERACTjs code for '.draggable' elements - eg nodes
interact('.draggable')
  .draggable({
	 snap: {
      targets: [
        interact.createSnapGrid({ x: 20, y: 20 })
      ],
      range: Infinity,
      relativePoints: [ { x: 0, y: 0 } ]
    },
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    // enable autoScroll
    autoScroll: true,

    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      var textEl = event.target.querySelector('p');

    }
	
  })
  .on('tap', function (event) {
	 // event.preventDefault();
	// event.stopPropagation();
	var calc
	if ($(event.target).hasClass("calc")){
		calc = $(event.target);
		$(event.target).addClass("active-calc")
		
	}else{
		calc = $(event.target).parents(".calc");
		
	}
	
	$("#calc").slideDown();
	$(calc).addClass("active-calc");
	loadCalcData(calc);
	
  })
  ;
  
  $("#workAreaWrapper").on("click", ".workArea", function(event){
	  if($(event.target).parents(".node").length==0 && !$(event.target).hasClass("node")  ){
		 $(".node").removeClass("active-node")
		  clearNodeData();
		 
	}
	
	
	if($(event.target).parents(".calc").length==0 && !$(event.target).hasClass("calc")  ){
		 $(".calc").removeClass("active-calc")
		  clearCalcData();
	}

	if($(event.target).parents(".destination-label").length==0 && !$(event.target).hasClass("destination-label")){
		$(".connector-graphit").removeClass("selected-connector");
	}
  })
  
  

///////////////////////////////////////
// Tools for loading node data panel //
///////////////////////////////////////

function loadNodeData(node){
	var aId=$(node).attr("id");
	$("#activeData").attr("aId", aId);

	var aTooltip=$(node).find("span.icon")[0].dataset.originalTitle;
	$("#nodedata p#node-information").html(aTooltip).removeClass('empty');

	var aCaption=$(node).find(".text").text();
	$("#activeData #aCaption").val(aCaption).prop('disabled', false);

	var aTimer=$(node).find("span.time").is(':visible');
	if(aTimer) {
		$("#activeData #aTimer").prop('checked',true).prop('disabled', false);
		$("#activeData #aTimeHolder").show();
	}
	else {
		$("#activeData #aTimer").prop('checked',false).prop('disabled', false);
		$("#activeData #aTimeHolder").hide();
	}

	var aTime=$(node).find("span.time").text();
	$("#activeData #aTime").val(aTime);
}

function updateNode(nodeId){
	var node=$(".dragArea #" +nodeId);

	var iCaption=$("#activeData #aCaption").val();
	$(node).find(".text").text(iCaption);

	$("#controls #aTimer").is(':checked') ? $(node).find("span.time").show() : $(node).find("span.time").hide();

	var iTime=$("#activeData #aTime").val();
	$(node)[0].dataset.time = iTime;	
	$(node).find("span.time").text(iTime);
}

function clearNodeData(){
    var aClear="";
	var aId="";
	$("#controls p#node-information").html("nothing selected").addClass('empty');
	$("#activeData #aCaption, #activeData #aTime").val(aClear);
	$("#activeData #aCaption, #activeData #aTimer").attr('checked',false).prop( "disabled", true );
	$("#activeData #aTimeHolder").hide();
	$("#activeData").attr("aId", aId);
}

$("#activeData input").change(function(){ 
	var aId=$("#activeData").attr("aId");
	if (aId!=""){
		updateNode(aId)
	}
});

$("#controls #deleteNode").click(function(e){
	e.preventDefault();
	var aId=$("#activeData").attr("aId");
	if (aId!=""){
		deleteNodeAndConnectors(aId);
		clearNodeData();
	}
});

$("#controls #aTimer").change(function() {
	if ($(this).is(':checked')) {
		$("#aTimeHolder").show();
	}
	else {
		$("#aTimeHolder").hide();
	}
});

///////////////////////////////////////
// Tools for loading CS Calculator   //
///////////////////////////////////////

function loadCalcData(calc){
	// var aMinwage=parseFloat($(calc).find(".minwage").text());
	var aMinwage=parseFloat($(calc).attr("data-minwage"));

	var aMins=parseFloat($(calc).find(".mins").text());
	var aId=$(calc).attr("id");
	$("#calcData #aMinwage").val(aMinwage);
	$("#calcData #aMins").val(aMins);
	$("#calcData ").attr("aId", aId);
	$("#calcData input").removeAttr('disabled');
}

function updateCalc(calcId){
	var calc=$(".dragArea #" +calcId);
	var iMinwage=parseFloat($("#calcData #aMinwage").val());
	var iMins=parseFloat($("#calcData #aMins").val());
	var iSaving=(iMinwage/60) * iMins * 5 * 5 * 45;
	//$(calc).find(".minwage").text(iMinwage);
	$(calc).attr("data-minwage", iMinwage);
	$(calc).find(".mins").text(iMins);
	$(calc).find(".saving").text(iSaving.toFixed(2));
}
 
function clearCalcData(){
	  var aMinwage="";
	  var aMins="";
	  var aId="";
	  $("#calcData #aMinwage").val(aMinwage);
	  $("#calcData #aMins").val(aMins);
	  $("#calcData ").attr("aId", aId);
	  $("#calcData input").attr('disabled','disabled');
}
 
$("#calcData input").change( function(){ 
	var aId=$("#calcData ").attr("aId")
	if (aId!=""){
		updateCalc(aId);
	}
});
 
$("#activeData #deleteNode").click( function(e){
	e.preventDefault();
	var aId=$("#activeData ").attr("aId")
	if (aId!=""){
		deleteNodeAndConnectors(aId);
		clearNodeData();
	}
});



///////////////////////////////////////
// Tools for loading workflow data panel //
///////////////////////////////////////

function loadWorkflowMetaData(workAreaId){
	
	var workArea=$("#"+workAreaId);
	$("#workflowData").attr("workAreaId", workAreaId);
	var wname = workArea.attr("data-name");
	var wpublic = (workArea.attr("data-public") === 'true');
	$("#workflowdata #wName").val(wname);
	$("#workflowdata #wPublic").prop('checked',wpublic);
}

function updateWorkflowMetaData(workAreaId){
	var workArea=$("#"+workAreaId);
	var wname=$("#workflowdata #wName").val();
	var wpublic=$("#workflowdata #wPublic").prop('checked');
	setWorkflowMetaData(workAreaId, wname, wpublic);
}

function setWorkflowMetaData(workAreaId, wname, wpublic){
	$("#"+workAreaId).attr("data-name", wname);
	$("#"+workAreaId).attr("data-public", wpublic);
	$("#flowTabs").find('a[data-target="'+workAreaId+'"]').text(wname);
}


function clearWorkflowMetaData(){
    var aClear="";
	var aId="";
	$("#controls p#node-information").html("nothing selected").addClass('empty');
	$("#activeData #aCaption, #activeData #aTime").val(aClear);
	$("#activeData #aTimer").attr('checked',false);
	$("#activeData #aTimeHolder").hide();
	$("#activeData").attr("aId", aId);
}

$("#workflowdata input").change(function(){ 
	var workAreaId=$("#workflowData").attr("workAreaId");
	if (workAreaId!=""){
		updateWorkflowMetaData(workAreaId);
	}
});









///////////////////////////////////////
// tabbing workflows                 //
///////////////////////////////////////

//$('#flowTabs li a').click(function(e) {
$('#flowTabs').on( 'click', 'li a', function(e) {
	e.preventDefault();
	var id=$(this).attr("data-target");
	makeWorkAreaActive(id)
});

function makeWorkAreaActive(workAreaId){
	 var tab = $('#flowTabs li a[data-target="'+workAreaId+'"]');
	$('#flowTabs li').removeClass();
	$(tab).parent('li').addClass('active');
	$('.workArea').removeClass('active');
	$('#'+workAreaId).addClass('active');
	switchDrawing();
	loadWorkflowMetaData(workAreaId)
	
}

function switchDrawing() {
	$(".drawArea").hide();
	if($('#drawControls').is(':visible'))
		$(".workArea.active > .drawArea").show();
}



///////////////////////////////////////
// old interact code                 //
///////////////////////////////////////
 
  interact('.draggable .text')
  .on('tap', function (event) {
	event.preventDefault();
	var txt=$(event.target).text();
	
	bootbox.prompt({
	  title: "Edit text",
	  value: txt,
	  callback: function(result) {
		  if(result !=null){
			  $(event.target).text(result)
		  }
		
	  }
	});
	
  
  });

  function dragMoveListener (event) {
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px)';

    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  }

  // this is used later in the resizing and gesture demos
  window.dragMoveListener = dragMoveListener;
  
  
  
  
  
  
  
  
 // INTERACTjs code for trash can
  interact('.dropzone').dropzone({
  // only accept elements matching this CSS selector
  accept: ' .resize-drag, .node',
  // Require a 75% element overlap for a drop to be possible
  overlap: 0.1,

  // listen for drop related events:

  ondropactivate: function (event) {
    // add active dropzone feedback
    event.target.classList.add('drop-active');
  },
  ondragenter: function (event) {
    var draggableElement = event.relatedTarget,
        dropzoneElement = event.target;

    // feedback the possibility of a drop
    dropzoneElement.classList.add('drop-target');
    draggableElement.classList.add('can-drop');
    //draggableElement.textContent = 'Dragged in';
  },
  ondragleave: function (event) {
    // remove the drop feedback style
    event.target.classList.remove('drop-target');
    event.relatedTarget.classList.remove('can-drop');
    //event.relatedTarget.textContent = 'Dragged out';
  },
  ondrop: function (event) {
    //event.relatedTarget.textContent = 'Dropped';
	 $(event.relatedTarget).remove();
  },
  ondropdeactivate: function (event) {
    // remove active dropzone feedback
    event.target.classList.remove('drop-active');
    event.target.classList.remove('drop-target');
  }
});


 // INTERACTjs code for resizable draggable elements e.g. connectors
  //resizable only vertically

    interact('.resize-nodrag.up, .resize-nodrag.down')
  .draggable({
	
    // enable autoScroll
    autoScroll: true,
    onmove: window.dragMoveListener
  })
  .resizable({
    preserveAspectRatio: false,
	edges: { left: false, right: false, bottom: true, top: true }
  })
  .on('resizemove', function (event) {
    var target = event.target,
	
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0);
    // update the element's style
	var min =parseInt($(target).css("min-height"))
	if(event.rect.height>min){
		$(target).addClass("active-connector");
	}else{
		$(target).removeClass("active-connector");
	}
	
    target.style.width  = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;
    //target.style.webkitTransform = target.style.transform =
    //    'translate(' + x + 'px,' + y + 'px)';
   // target.setAttribute('data-x', x);
   // target.setAttribute('data-y', y);
  });
  

  //resizable only horizontally
    interact('.resize-nodrag.left, .resize-nodrag.right')
  .draggable({
	
    
    // enable autoScroll
    autoScroll: true,
    onmove: window.dragMoveListener
  })
  .resizable({
    preserveAspectRatio: false,
	edges: { left: true, right: true, bottom: false, top: false }
  })
  .on('resizemove', function (event) {
    var target = event.target,
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0);
    // update the element's style
	var min =parseInt($(target).css("min-width"))
	if(event.rect.width>min){
		$(target).addClass("active-connector");
	}else{
		$(target).removeClass("active-connector");
	}
	
	
    target.style.width  = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;
	
	
    //target.style.webkitTransform = target.style.transform =
    //    'translate(' + x + 'px,' + y + 'px)';
   // target.setAttribute('data-x', x);
   // target.setAttribute('data-y', y);
  });
  
  
  
  
 //resizable and move vertically
  interact('.resize-drag.up, .resize-drag.down')
  .draggable({
	snap: {
      targets: [
        interact.createSnapGrid({ x: 20, y: 20 })
      ],
      range: Infinity,
      relativePoints: [ { x: 0, y: 0 } ]
    },
	// enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    // enable autoScroll
    autoScroll: true,
	
    onmove: window.dragMoveListener
  })
  .resizable({
    preserveAspectRatio: false,
	edges: { left: false, right: false, bottom: true, top: true }
  })
  .on('resizemove', function (event) {
    var target = event.target,
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0);
    // update the element's style
	
	
    target.style.width  = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;
    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  });
  
   //resizable and move horizontally
   interact('.resize-drag.left, .resize-drag.right')
  .draggable({
	snap: {
      targets: [
        interact.createSnapGrid({ x: 20, y: 20 })
      ],
      range: Infinity,
      relativePoints: [ { x: 0, y: 0 } ]
    },
   // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    // enable autoScroll
    autoScroll: true,
    onmove: window.dragMoveListener
  })
  .resizable({
    preserveAspectRatio: false,
	edges: { left: true, right: true, bottom: false, top: false }
  })
  .on('resizemove', function (event) {
    var target = event.target,
        x = (parseFloat(target.getAttribute('data-x')) || 0),
        y = (parseFloat(target.getAttribute('data-y')) || 0);
    // update the element's style
    target.style.width  = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    // translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;
    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)';
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
  });

// SAVE TO PDF
function savetopdf() {
	
	pdfWorkflow=JSON.stringify(extractAllWorkflows());
	
	var pdfhandler = 'http://192.168.3.26/EvoHtmlToPdfHandler/asehandler.ashx?';
	var pdfsource = 'http://192.168.3.26/workflow/pdf.asp?workflow='+pdfWorkflow;
	var pdfdelay = '3';
	var pdffilename = 'workflow';
	var pdfuserid = '35499';

	handlerURL = pdfhandler + 'evosource=url&evourl=' + pdfsource + '&evodelay=' + pdfdelay + '&evofilename=' + pdffilename + '_DATE_TIME.pdf&evouserid=' + pdfuserid;
	
	
	window.location.href = handlerURL
	//window.location.href = 'pdf.asp?workflow='+pdfWorkflow;
	
}

	$('#savetopdf').click(function() {	
		savetopdf();
		return false;
	});
  
	// CODE FOR SKETCH PAD
	var sketch

	$('.drawArea canvas.colors_sketch').each(function() {
		var thisSketch = $(this).sketch();
		sketches.push(thisSketch);
	});

	$(".drawArea, #drawControls").hide();
	 
	$("#toggle-draw").click(function(){
		//$("#drawArea").fadeToggle("fast");
		$(".workArea.active > .drawArea, #drawControls").toggle();
	});

	$(".color-picker, .eraser-picker").click(function(){
		$(".color-picker, .eraser-picker").removeClass("active");
		$(this).addClass("active");
	});
	  
	$(".brush-picker").click(function(){
		$(".brush-picker").removeClass("active");
		$(this).addClass("active");
	});
	
	
	
	// create a blank tab on load
	if (!(getParameterByName("workflow"))){
		addWorkArea();
	}
});