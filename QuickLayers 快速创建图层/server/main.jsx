// server/main.jsx

// --- 左键快速创建 ---
function fastCreate(type) {
    if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) return;
    
    app.beginUndoGroup("Quick Create");
    switch(type) {
        case "Solid": createSolidLayer(null, null, null, false); break;
        case "Adj":   createSolidLayer(null, null, null, true); break;
        case "Null":  createNullLayer(null); break;
        case "Cam":   createCameraLayer(null, null); break;
    }
    app.endUndoGroup();
}

// --- 右键原生弹窗 (居中显示) ---
function showDialog(type) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("请先打开一个合成！");
        return;
    }

    if (type === "Solid" || type === "Adj") {
        dialogSolid(type === "Adj", comp);
    } else if (type === "Null") {
        dialogNull(comp);
    } else if (type === "Cam") {
        dialogCam(comp);
    }
}

// --- 弹窗 UI (中文) ---

function dialogSolid(isAdj, comp) {
    var win = new Window("dialog", isAdj ? "设置调整图层" : "设置纯色图层");
    win.alignChildren = ["fill", "top"];
    
    var grpName = win.add("group");
    grpName.add("statictext", undefined, "名称:");
    var defName = isAdj ? "调整图层" : "纯色图层";
    var inpName = grpName.add("edittext", undefined, defName);
    inpName.characters = 20;

    var grpSize = win.add("group");
    grpSize.add("statictext", undefined, "宽:");
    var inpW = grpSize.add("edittext", undefined, comp.width); inpW.characters = 6;
    grpSize.add("statictext", undefined, "高:");
    var inpH = grpSize.add("edittext", undefined, comp.height); inpH.characters = 6;

    var grpBtn = win.add("group");
    grpBtn.alignment = "center";
    var btnOk = grpBtn.add("button", undefined, "确定", {name: "ok"});
    var btnCn = grpBtn.add("button", undefined, "取消", {name: "cancel"});
    
    btnCn.onClick = function() { win.close(); };

    if (win.show() == 1) {
        var w = parseFloat(inpW.text) || comp.width;
        var h = parseFloat(inpH.text) || comp.height;
        app.beginUndoGroup(isAdj ? "Create Adj" : "Create Solid");
        createSolidLayer(inpName.text, w, h, isAdj);
        app.endUndoGroup();
    }
}

function dialogNull(comp) {
    var win = new Window("dialog", "设置空对象");
    var grp = win.add("group");
    grp.add("statictext", undefined, "名称:");
    var inp = grp.add("edittext", undefined, "空对象");
    inp.characters = 20;
    
    var grpBtn = win.add("group");
    grpBtn.alignment = "center";
    var btnOk = grpBtn.add("button", undefined, "确定", {name: "ok"});
    var btnCn = grpBtn.add("button", undefined, "取消", {name: "cancel"});

    btnCn.onClick = function() { win.close(); };

    if (win.show() == 1) {
        app.beginUndoGroup("Create Null");
        createNullLayer(inp.text);
        app.endUndoGroup();
    }
}

function dialogCam(comp) {
    var win = new Window("dialog", "设置摄像机");
    win.alignChildren = ["fill", "top"];
    
    var grpName = win.add("group");
    grpName.add("statictext", undefined, "名称:");
    var inpName = grpName.add("edittext", undefined, "摄像机");
    inpName.characters = 20;

    var grpPre = win.add("group");
    grpPre.add("statictext", undefined, "预设焦距:");
    var drop = grpPre.add("dropdownlist", undefined, ["35mm", "50mm", "80mm", "135mm"]);
    drop.selection = 0;

    var grpBtn = win.add("group");
    grpBtn.alignment = "center";
    var btnOk = grpBtn.add("button", undefined, "确定", {name: "ok"});
    var btnCn = grpBtn.add("button", undefined, "取消", {name: "cancel"});

    btnCn.onClick = function() { win.close(); };

    if (win.show() == 1) {
        app.beginUndoGroup("Create Camera");
        createCameraLayer(inpName.text, drop.selection.text);
        app.endUndoGroup();
    }
}

// --- 核心创建逻辑 ---

function createSolidLayer(name, w, h, isAdj) {
    var comp = app.project.activeItem;
    var finalW = w || comp.width;
    var finalH = h || comp.height;
    var finalName = name || (isAdj ? "调整图层" : "纯色图层");
    var color = isAdj ? [1,1,1] : [0,0,0];
    
    var l = comp.layers.addSolid(color, finalName, finalW, finalH, comp.pixelAspect);
    if (isAdj) { l.adjustmentLayer = true; l.label = 9; } 
    else { l.label = 1; }
    l.selected = true;
}

function createNullLayer(name) {
    var comp = app.project.activeItem;
    var sel = comp.selectedLayers;
    
    var l = comp.layers.addNull();
    l.name = name || "空对象";
    l.label = 2; 
    l.anchorPoint.setValue([50, 50]);
    l.position.setValue([comp.width/2, comp.height/2]);

    if (sel.length > 0) {
        try { l.position.setValue(sel[0].transform.position.value); } catch(e){}
        
        for(var i=0; i<sel.length; i++) {
            var target = sel[i];
            if (target instanceof CameraLayer) {
                l.threeDLayer = true;
                l.position.setValue(target.transform.position.value);
                if (target !== l) target.parent = l;
            } else {
                if (target !== l) target.parent = l;
                if (target.threeDLayer) l.threeDLayer = true;
            }
        }
    }
    l.selected = true;
}

function createCameraLayer(name, presetStr) {
    var comp = app.project.activeItem;
    var nm = name || "摄像机";
    var l = comp.layers.addCamera(nm, [comp.width/2, comp.height/2]);
    
    var fl = 35;
    if (presetStr) fl = parseInt(presetStr) || 35;
    var filmSize = 36; 
    var zoom = fl * (comp.width / filmSize);
    
    l.cameraOption.zoom.setValue(zoom);
    l.cameraOption.focusDistance.setValue(zoom);
    
    try {
        l.transform.pointOfInterest.setValue([comp.width/2, comp.height/2, 0]);
        l.transform.position.setValue([comp.width/2, comp.height/2, -zoom]);
    } catch(e) {
        l.transform.position.setValue([comp.width/2, comp.height/2, -zoom]);
        l.transform.rotation.setValue(0);
    }
}