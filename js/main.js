g_network = undefined
g_play = false
g_video_is_playing = false
g_delta = 0
g_frame_time_target = 1/15
 window.addEventListener('keydown', function (event) {
    if (event.key == " "){
        g_play = !g_play
    }
 })

 Element.prototype.getElementsByName = function (arg) {
    var returnList = [];
    (function BuildReturn(startPoint) {
        for (var child in startPoint) {
            if (startPoint[child].nodeType != 1) continue; //not an element
            if (startPoint[child].getAttribute("name") == arg) returnList.push(startPoint[child]);
            if (startPoint[child].childNodes.length > 0) {
                BuildReturn(startPoint[child].childNodes);
            }
        }
    })(this.childNodes);
    return returnList;
};

var view = document.getElementById('main_viewer');
if (!Detector.webgl) Detector.addGetWebGLMessage();
var camera, scene, renderer, stats, controls;

var clock = new THREE.Clock();
three_stats = new Stats();
three_stats.dom.id = 'three_stats'
document.body.appendChild( three_stats.dom );

var ambient, pointLight;

//X-RAY SHADER MATERIAL
//http://free-tutorials.org/shader-x-ray-effect-with-three-js/
var materials = {
    default_material: new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, shininess: 0}),
    default_material_flat: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, flatShading: true}),
    default_material2: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    wireframeMaterial: new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        wireframe: true, 
        shininess: 100,
        specular: 0x000, emissive: 0x000,
        flatShading: false, depthWrite: true, depthTest: true
    }),
    // wireframeMaterial2: new THREE.LineBasicMaterial({ wireframe: true, color: 0xffffff }),
    wireframeAndModel: new THREE.LineBasicMaterial({ color: 0xffffff }),
    phongMaterial: new THREE.MeshPhongMaterial({
        color: 0x555555, specular: 0xffffff, shininess: 10,
        flatShading: false, side: THREE.DoubleSide, flatShading: true
    }),
    xrayMaterial: new THREE.ShaderMaterial({
        uniforms: {
            p: { type: "f", value: 3 },
            glowColor: { type: "c", value: new THREE.Color(0x84ccff) },
        },
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false
    })
};


function initScene() {

    scene = new THREE.Scene();
    scene_objects = new THREE.Group();
    scene.add(scene_objects)

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 500000);
    camera.position.set(0, 0, 20);

    //Setup renderer
    //renderer = new THREE.CanvasRenderer({ alpha: true });
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x292121); //565646, 29212

    view.appendChild(renderer.domElement);

    THREEx.WindowResize(renderer, camera);

    
    ambient = new THREE.AmbientLight(0xffffff, 2.0);
    scene_objects.add(ambient)
    ambient.visible = false
    amb.checked = false
    $('#ambient_light').change(function () {
        if (amb.checked) {
            ambient.visible = true
        }
        else {
            ambient.visible = false
        }
    });


    /*LIGHTS*/

    pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(0, 0, 500)
    pointLight.lookAt(0,0,0)
    camera.add(pointLight);

    scene_objects.add(camera);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.49;
    controls.keys = {
        LEFT: 'a', //left arrow
        UP: 'w', // up arrow
        RIGHT: 'd', // right arrow
        BOTTOM: 's' // down arrow
    }
    
    gridHelper = new THREE.GridHelper(10, 40, 0xe6e600, 0x808080);
    gridHelper.position.set(0,-0.5,0)
    gridHelper.visible = false;
    $('#grid').change(function () {
        if (grid.checked) {
            gridHelper.visible = true;
        }
        else {
            gridHelper.visible = false;
        }
    });
    scene_objects.add(gridHelper)


    polar_grid_helper = new THREE.PolarGridHelper(5, 16, 8, 64);
    polar_grid_helper.visible = false;
    polar_grid_helper.position.set(0,-0.5,0)
    scene_objects.add(polar_grid_helper)
    $('#polar_grid').change(function () {
        if (polar_grid.checked) {
            polar_grid_helper.visible = true;
        }
        else {
            polar_grid_helper.visible = false;
        }
    });

    axis_view = new THREE.AxesHelper(5); //Set axis size based on the non visible box3() size.
    axis_view.visible = false;
    scene_objects.add(axis_view)

    $('#axis').change(function () {
        if (axis.checked) {
            axis_view.visible = true;
        }
        else {
            axis_view.visible = false;
        }
    });


    //Colour changer, to set background colour of renderer to user chosen colour
    $(".bg_select").spectrum({
        color: "#fff",
        change: function (color) {
            $("#basic_log").text("Hex Colour Selected: " + color.toHexString()); //Log information
            var bg_value = $(".bg_select").spectrum('get').toHexString(); //Get the colour selected
            renderer.setClearColor(bg_value); //Set renderer colour to the selected hex value
            document.body.style.background = bg_value; //Set body of document to selected colour           
        }
    });

    var g_demo_files = []
    for (var i=5538; i<5620; i++){
        g_demo_files.push({'name': 'sample_models/' + String(i).padStart(6, '0') + '.obj'})
        g_demo_files.push({'name': 'sample_models/' + String(i).padStart(6, '0') + '.png'})
    }

    updateFrameHandlerAndSliderLocal(g_demo_files)

}

$("#red, #green, #blue, #ambient_red, #ambient_green, #ambient_blue").slider({
    change: function (event, ui) {
        render();
    }
});

var rotVal = [40, 80, 110, 140, 170, 200, 240, 280, 340, 400, 520]; //Rotation speeds low - high
var rotation_speed;

$("#rot_slider").slider({
    orientation: "horizontal",
    range: "min",
    max: rotVal.length - 1,
    value: 0,
    disabled: true,
    slide: function (event, ui) {
        rotation_speed = rotVal[ui.value]; //Set speed variable to the current selected value of slider
    }
});

function setColours() {
    if (ambient == undefined) return
    var colour = getColours($('#ambient_red').slider("value"), $('#ambient_green').slider("value"),
                            $('#ambient_blue').slider("value"));
    ambient.color.setRGB(colour[0], colour[1], colour[2]);

}

function getColours(r, g, b) {

    var colour = [r.valueOf() / 255, g.valueOf() / 255, b.valueOf() / 255];
    return colour;
}

function render() {

    setColours();
   renderer.render(scene, camera);
}

function animate() {
    g_delta = clock.getDelta();
    if (g_frame_handler != undefined){
        g_frame_handler.animate()
        g_frame_handler.updateStats()
        if (g_frame_handler.getRenderedModel() != undefined && g_frame_handler.getRenderedModel().children.length > 0){
            setShadingAsNeeded(g_frame_handler.getRenderedModel())
            rotateModel(g_frame_handler.getRenderedModel())
        }
        controls.update();
    }
    requestAnimationFrame(animate);    
    render();

}


$(document).ready(function() {
    $('#three_stats').draggable()
    // three_stats.dom.style.position = 'relative';
    // three_stats.dom.style.float = 'left';
    $("#video_container").draggable().resizable();
    // $("#texture_container").draggable().resizable();
    $("#stats").draggable().resizable();
    // $("#texture_container").draggable();
    var video = document.getElementById("video_player")

    video.addEventListener('play', (event) => {
        g_video_is_playing = true
      });
    video.addEventListener('pause', (event) => {
        g_video_is_playing = false
      });
 });




document.getElementById("play_button").addEventListener('click', () =>{
    g_play = !g_play
})

function removeNan(array) {
    return array.filter(function (value) {
        return !Number.isNaN(value);
});
}

$('#show_video').change(function () {
    if (!g_frame_handler instanceof FramesHandler) return   
    if ($('#show_video')[0].checked) {
        $("#video_container")[0].style.display = "block"
    }
    else {
        $("#video_container")[0].style.display = "none"
    }
});

function resizeTexturesToDefault(){
    for (var c=0; c<document.getElementById('texture_view').children.length; c++){
        document.getElementById('texture_view').children[c].style.width = '512px'
        document.getElementById('texture_view').children[c].style.height = '512px'
        fixtextureImageSizeAfterResize(document.getElementById('texture_view').children[c])
    }
}

function resizeImageToDefault(){
    if (g_frame_handler.last_message.images == undefined) return
    for (var c=0; c<document.getElementById('image_view').children.length; c++){
        
        document.getElementById('image_view').children[c].style.width = 
        String(g_frame_handler.last_message.images[c].imageWidth) + 'px'
        document.getElementById('image_view').children[c].style.height = 
        String(g_frame_handler.last_message.images[c].imageHeight) + 'px'
        fixImageSizeAfterResize(document.getElementById('image_view').children[c])
    }
}

$("#texture_view")[0].style.display = "none"

$('#show_texture').change(function () {
    if ($('#show_texture')[0].checked) {
        $("#texture_view")[0].style.display = "block"
        resizeTexturesToDefault()

    }
    else {
        $("#texture_view")[0].style.display = "none"
    }
    g_frame_handler.reShow()
});

$('#show_video').change(function () {
    if (!g_frame_handler instanceof FramesHandlerLive) return   
    if ($('#show_video')[0].checked) {
        $("#image_view")[0].style.display = "block"
        resizeImageToDefault()

    }
    else {
        $("#image_view")[0].style.display = "none"
    }
    g_frame_handler.reShow()
});



$('#draw_uvs_on_texture').change(function () {
    for (var i=0; i<document.getElementsByName("uv_image").length; i++){
        g_frame_handler.clearUVImage(document.getElementsByName("uv_image")[i])
        g_frame_handler.updateUV()
    }
})
function fixtextureImageSizeAfterResize(contatiner){
    contatiner.getElementsByName('uv_image')[0].width = parseInt(contatiner.style.width)
    contatiner.getElementsByName('texture_canvas')[0].width = parseInt(contatiner.style.width)
    contatiner.getElementsByName('texture_image')[0].style.width = contatiner.style.width
    contatiner.getElementsByName('uv_image')[0].height = parseInt(contatiner.style.height)
    contatiner.getElementsByName('texture_canvas')[0].height = parseInt(contatiner.style.height)
    contatiner.getElementsByName('texture_image')[0].style.height = contatiner.style.height
}

function fixImageSizeAfterResize(contatiner){
    contatiner.getElementsByName('image_canvas')[0].width = parseInt(contatiner.style.width)
    contatiner.getElementsByName('image_canvas')[0].height = parseInt(contatiner.style.height)
}

function showVideoTimeStamp(time_stamp){
    var video = document.getElementById("video_player")
    var ct = Math.round((video.currentTime + Number.EPSILON) * 1000) / 1000
    time_stamp = Math.round((time_stamp + Number.EPSILON) * 1000) / 1000
    if (ct == time_stamp) return
    // console.log(time_stamp)
    setTimeout(() =>{
    video.currentTime = time_stamp}, 0)

}

document.getElementById("container").addEventListener("drop", dropHandler);
document.getElementById("container").addEventListener("dragover", (event)=>{event.preventDefault()});

function dropHandler(event) {
    console.log('File(s) dropped');
    console.log(event.dataTransfer.files);
    updateFrameHandlerAndSlider(event.dataTransfer.files)
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();


}

function updateVideo(file){
    $('#show_video')[0].checked = true
    var video = document.getElementById("video_player")
    var fileURL = URL.createObjectURL(file);
    video.src = fileURL;
}

function addImage(image_id, width, height){
    const node = document.createElement("div");
    node.className = "movingDiv"
    node.style.position = 'absolute'
    node.style.left = String(50+parseInt(image_id)*3) + '%'
    var id = 'image_container_'+String(image_id)
    node.id = id
    node.innerHTML = 
    `<canvas hidden name="image_canvas_hidden" style="position: absolute;"></canvas>
    <canvas name="image_canvas" style="position: absolute;"></canvas>`
    document.getElementById("image_view").appendChild(node);
    document.getElementById(id).style.width = String(width) + 'px'
    document.getElementById(id).style.height = String(height) + 'px'
    $("#"+id).draggable().resizable();

    $('#' + id).elementResize(function(event) {
        fixImageSizeAfterResize(event.target)
     });
     resizeImageToDefault()

}

function addTextureImage(model_id){
    const node = document.createElement("div");
    node.className = "movingDiv"
    node.style.position = 'absolute'
    node.style.left = String(70+parseInt(model_id)*3) + '%'
    var id = 'texture_container_'+String(model_id)
    node.id = id
    node.innerHTML = 
    `<canvas hidden name="texture_canvas_hidden" style="position: absolute;"></canvas>
    <canvas name="texture_canvas" style="position: absolute;"></canvas>
    <canvas name="uv_image" style="position: absolute;"></canvas>
    <img name="texture_image">`
    document.getElementById("texture_view").appendChild(node);
    document.getElementById(id).style.width = '512px'
    document.getElementById(id).style.height = '512px'
    $("#"+id).draggable().resizable();

    $('#' + id).elementResize(function(event) {
        fixtextureImageSizeAfterResize(event.target)
        g_frame_handler.updateUV()
     });
     resizeTexturesToDefault()

}

function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}
var query_params = getAllUrlParams(window.location.href)
if ('ip' in query_params){
    var network = NetworkClient(query_params.ip, parseInt(query_params.port))
}
initScene()
animate();

