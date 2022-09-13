
var amb = document.getElementById('ambient_light');
var rot1 = document.getElementById('rotation');
var wire = document.getElementById('wire_check');
var model_wire = document.getElementById('model_wire');
var phong = document.getElementById('phong_check');
var xray = document.getElementById('xray_check');
var glow = document.getElementById('glow_check');
var grid = document.getElementById('grid');
var polar_grid = document.getElementById('polar_grid');
var axis = document.getElementById('axis');
var bBox = document.getElementById('bBox');

var transform = document.getElementById('transform');
var non_smooth = document.getElementById('non_smooth');
var outline = document.getElementById('outline');

var statsNode = document.getElementById('stats');
var g_rotation_y = 0

function stats(modelName, num_of_faces, numOfMeshes) {
        statsNode.innerHTML = 'index: ' + '<span class="statsText">' + modelName + '</span>'
           + '<br>'
           + 'Number of faces: ' + '<span class="statsText">' + num_of_faces + '</span>'
           + '<br>'
           + 'Number of Meshes: ' + '<span class="statsText">' + numOfMeshes + '</span>';

}

function setCamera(mod) {
    var bbox = new THREE.Box3().setFromObject(mod);

    /*MODELS OF DIFFERENT SIZES TO FIT IN CAMERA VIEW*/
    var height = bbox.getSize().y;
    // var dist = height / (2 * Math.tan(camera.fov * Math.PI / 360));
    var dist = height / 2 / Math.tan(camera.fov * Math.PI / 360);
    var pos = scene.position;
    camera.position.set(pos.x, pos.y, dist*1.2);
    camera.lookAt(pos);
}

 
function getMaterial(model){
    if (model.children[0].userData.material){
        return model.children[0].userData.material
    }
    return materials.default_material
}



function setShadingAsNeeded(model){
    materials.wireframeAndModel.visible = false;
    model.children[0].material = getMaterial(model)
    model.children[0].material.wireframe = false
    model.children[0].material.flatShading = false
    // smooth_geom = new THREE.Geometry().fromBufferGeometry(model.children[0].geometry);
    if (phong.checked){
        model.children[0].material = materials.phongMaterial
    }
    else if (non_smooth.checked){
        model.children[0].material.flatShading = true
    }
    else if (xray.checked){
        model.children[0].material = materials.xrayMaterial
    }
    else if (model_wire.checked){
        model.children[0].material.wireframe = true
    }
    else if (wire.checked){
        model.children[0].material = materials.wireframeMaterial;
    }
    model.children[0].material.needsUpdate = true
}

//PointLight intensity slider
$("#point_light").slider({
    orientation: "horizontal",
    min: 0,
    max: 4,
    step: 0.1,
    value: 1.5,
    slide: function (event, ui) {
        pointLight.intensity = ui.value;
    },
    change: function (event, ui) {
        pointLight.intensity = ui.value;
    }
});

$("#point_light_position_x").slider({
    orientation: "horizontal",
    min: -1000,
    max: 1000,
    step: 0.1,
    value: 0,
    slide: function (event, ui) {
        pointLight.position.x = parseFloat(ui.value);
        pointLight.lookAt(0,0,0)
    },
    change: function (event, ui) {
        pointLight.position.x = parseFloat(ui.value);
        pointLight.lookAt(0,0,0)

    }
});

$("#point_light_position_y").slider({
    orientation: "horizontal",
    min: -1000,
    max: 1000,
    step: 0.1,
    value: 0,
    slide: function (event, ui) {
        pointLight.position.y = parseFloat(ui.value);
        pointLight.lookAt(0,0,0)
    },
    change: function (event, ui) {
        pointLight.position.y = parseFloat(ui.value);
        pointLight.lookAt(0,0,0)
    }
});

$("#point_light_position_z").slider({
    orientation: "horizontal",
    min: -1000,
    max: 1000,
    step: 0.1,
    value: 500,
    slide: function (event, ui) {
        pointLight.position.z = parseFloat(ui.value);
        pointLight.lookAt(0,0,0);
    },
    change: function (event, ui) {
        pointLight.position.z = parseFloat(ui.value);
        pointLight.lookAt(0,0,0)
    }
});

//Set colour of glow model to value from colour
$(".glow_select").spectrum({
    color: "#fff",
    change: function (color) {
        $("#basic-log").text("Hex Colour Selected: " + color.toHexString()); //Log information
        glow_value = $(".glow_select").spectrum('get').toHexString(); //Get the colour selected
        //Set outlinePass effect edge colour to selected value
        outlinePass.visibleEdgeColor.set(glow_value);
    }
});

/*SCALE FUNCTIONS*/
var loopScale = 0;
scale = 1;

function scaleUp(mod) {

   // User clicks scale button once at a time, scale applied once
    $('#scale_up').click(function (e) {
        if (modelLoaded || sample_model_loaded) {

            if (mod.scale.z < 25) {

                scale += (scale * 0.45);
                mod.scale.x = mod.scale.y = mod.scale.z = scale;
            }         
        }
    });
}

function scaleDown(mod) {

    //User clicks scale button once at a time, scale applied once
    $('#scale_down').click(function (e) {
        if (modelLoaded || sample_model_loaded) {
            
            scale -= (scale * 0.35);
            mod.scale.x = mod.scale.y = mod.scale.z = scale;
        }
    });
}
var g_rotation_direction = +1
var rotation_limit = 500

$('#rotation_limit').change( ()=> {
    g_rotation_y = 0
    if (document.getElementById('rotation_limit').value == ''){
        rotation_limit = 500
        g_rotation_direction = +1
    }
    else{
        rotation_limit = Math.PI /180 * parseFloat(document.getElementById('rotation_limit').value)
    }
})
function rotateModel(model){
    if (Math.abs(g_rotation_y) > rotation_limit) g_rotation_direction = -g_rotation_direction
    if (rot1.checked){
        g_rotation_y = g_rotation_y + g_rotation_direction*$('#rotation_speed').slider("value") / 255 / 10
    }
    model.rotation.set(model.rotation.x,
                       g_rotation_y,
                       model.rotation.z);
}


$("#reset_rot").click(function () {
    if (g_frame_handler){
        g_rotation_y = 0
    }
});


/*Animation Controls */
//credit: https://raw.githubusercontent.com/mrdoob/three.js/dev/editor/js/Sidebar.Animation.js

function addAnimation( object, model_animations ) {

    animations[ object.uuid ] = model_animations;

    if(model_animations.length > 0 ){
        animsDiv.style.display = "block";
    }
    else{
        animsDiv.style.display = "none";
    }
}

function animControl( object ) {

    var uuid = object !== null ? object.uuid : '';
    var anims = animations[ uuid ];

    if ( anims !== undefined ) {

        mixer = new THREE.AnimationMixer( object );
        var options = {};
        for ( var animation of anims ) {

            options[ animation.name ] = animation.name;

            var action = mixer.clipAction( animation );
            actions[ animation.name ] = action;
        }

        setOptions( options );
    }
}

function playAnimation() {

    currentAnimation = actions[ animationsSelect.value ];
    if ( currentAnimation !== undefined ) {

        stopAnimations();
        currentAnimation.play();
      //  updateAnimation();

    }
}

function playAllAnimation(anims) {

    if(anims !== undefined){
        
        document.getElementById("playAll").onclick = function(){
            anims.forEach(function (clip) {               
                 mixer.clipAction(clip).reset().play();
             });
        }
    }
}       

function stopAnimations() {

    if ( mixer !== undefined ) {

        mixer.stopAllAction();

    }
}

 function setOptions( options ) {

    var selected = animationsSelect.value;

    while ( animationsSelect.children.length > 0 ) {

        animationsSelect.removeChild( animationsSelect.firstChild );

    }

    for ( var key in options ) {

        var option = document.createElement( 'option' );
        option.value = key;
        option.innerHTML = options[ key ];
        animationsSelect.appendChild( option );

    }

    animationsSelect.value = selected;
}

document.getElementById("play").onclick = playAnimation;
document.getElementById("stop").onclick = stopAnimations;

function getAllUrlParams(url) {

    // get query string from url (optional) or window
    var queryString = url ? url.split('?')[1] : window.location.search.slice(1);
  
    // we'll store the parameters here
    var obj = {};
  
    // if query string exists
    if (queryString) {
  
      // stuff after # is not part of query string, so get rid of it
      queryString = queryString.split('#')[0];
  
      // split our query string into its component parts
      var arr = queryString.split('&');
  
      for (var i = 0; i < arr.length; i++) {
        // separate the keys and the values
        var a = arr[i].split('=');
  
        // set parameter name and value (use 'true' if empty)
        var paramName = a[0];
        var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];
  
        // (optional) keep case consistent
        paramName = paramName.toLowerCase();
        if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();
  
        // if the paramName ends with square brackets, e.g. colors[] or colors[2]
        if (paramName.match(/\[(\d+)?\]$/)) {
  
          // create key if it doesn't exist
          var key = paramName.replace(/\[(\d+)?\]/, '');
          if (!obj[key]) obj[key] = [];
  
          // if it's an indexed array e.g. colors[2]
          if (paramName.match(/\[\d+\]$/)) {
            // get the index value and add the entry at the appropriate position
            var index = /\[(\d+)\]/.exec(paramName)[1];
            obj[key][index] = paramValue;
          } else {
            // otherwise add the value to the end of the array
            obj[key].push(paramValue);
          }
        } else {
          // we're dealing with a string
          if (!obj[paramName]) {
            // if it doesn't exist, create property
            obj[paramName] = paramValue;
          } else if (obj[paramName] && typeof obj[paramName] === 'string'){
            // if property does exist and it's a string, convert it to an array
            obj[paramName] = [obj[paramName]];
            obj[paramName].push(paramValue);
          } else {
            // otherwise add the property
            obj[paramName].push(paramValue);
          }
        }
      }
    }
  
    return obj;
  }



  function load_with_factorized(obj_path, texture_path, specular_path, roughness_path){
    if (scene.children.length > 1){
        scene.remove(scene.children[1])
    }
    var loader = new OBJSlimLoader(manager);
    loader.load(obj_path, function (obj) {
        let txt_loader = new THREE.TextureLoader(manager)
        let roughness_loader = new THREE.TextureLoader(manager)
        let metalness_loader = new THREE.TextureLoader(manager)

        txt_loader.load(texture_path, function(txt){
            roughness_loader.load(roughness_path, function(rough){
                    metalness_loader.load(specular_path, function(metal){
                        var group = new THREE.Group()
                        group.name = 'model'
                        var model = obj.obj;
                        model.geometry.center()
                        model.rotateX(Math.PI)
                        var model_text_only = model.clone()
                        var model_roughness = model.clone()
                        var model_specular = model.clone()


                        var my_mtl_text = new THREE.MeshPhysicalMaterial()
                        var my_mtl_roughness = new THREE.MeshPhysicalMaterial()
                        var my_mtl_specular = new THREE.MeshPhysicalMaterial()
                        
                        model_text_only.material = my_mtl_text
                        my_mtl_text.map = txt
                        scene.add(model_text_only)

                        model_roughness.material = my_mtl_roughness
                        my_mtl_roughness.map = txt
                        my_mtl_specular.clearcoatRoughnessMap = rough
                        my_mtl_specular.clearcoatRoughness = 1
                        model_roughness.position.set(100,0,0)
                        scene.add(model_roughness)

                        model_specular.material = my_mtl_specular
                        my_mtl_specular.map = txt
                        my_mtl_specular.clearcoatRoughnessMap = rough
                        my_mtl_specular.specularIntensityMap = metal
                        my_mtl_specular.specularIntensity = 1
                        my_mtl_specular.clearcoatRoughness = 1
                        model_specular.position.set(200,0,0)
                        scene.add(model_specular)
                        
                    })
            })
        })
    })
}