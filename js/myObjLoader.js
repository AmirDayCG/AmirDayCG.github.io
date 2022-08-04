const manager = new THREE.LoadingManager();
var extraFiles = []

manager.setURLModifier(function (url, path) {

        url = url.replace('data:application/', '');
        url = url.split(/[\/\\]/);
        url = url[url.length - 1];

        if (extraFiles[url] !== undefined) {

            const blobURL = URL.createObjectURL(extraFiles[url]);
            return blobURL;
        }

        return url;
    });
manager.onStart = function(url){
    g_currently_loading = true
}
manager.onLoad = function(){
    g_currently_loading = false
}

function objLoaderWrapper(path_object, index, frame_buffer){
    loadObjAndMaterial(path_object.obj, path_object.mtl, path_object.texture, path_object.extra_files, index, frame_buffer)
}

function loadObjAndMaterial(obj_path, mtl_path, texture_path, extra_paths, index, frame_buffer){
    
    extraFiles = extra_paths
    my_mtl = undefined
    if (texture_path == undefined && mtl_path == undefined){
        my_mtl = materials.default_material
    } 
    else if (mtl_path == undefined){
        let txt = new THREE.TextureLoader(manager).load(texture_path);
        my_mtl = new THREE.MeshLambertMaterial({
                            map: txt,
                            color: 0xffffff,
                            skinning: true,
                            });      
    }

    var mtlloader = new THREE.MTLLoader(manager);
    mtlloader.load(mtl_path, function (materials_load) {
        var loader = new THREE.OBJLoader(manager);
        if (mtl_path != undefined){
            loader.setMaterials(materials_load);
        }
        loader.load(obj_path, function (obj) {
            model = obj;
            model.userData.material = model.children[0].material
            model.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    if (mtl_path == undefined){
                        child.material = my_mtl
                        model.userData.material = my_mtl
                    }
                    var smooth_geom = new THREE.Geometry().fromBufferGeometry(child.geometry);
                    smooth_geom.mergeVertices()
                    smooth_geom.computeVertexNormals()
                    child.geometry= new THREE.BufferGeometry().fromGeometry(smooth_geom)
                    // buffergeometry = new THREE.BufferGeometry().fromGeometry(smooth_geom);

                    var wireframe2 = new THREE.WireframeGeometry(child.geometry);
                    var edges = new THREE.LineSegments(wireframe2, materials.wireframeAndModel);
                    materials.wireframeAndModel.visible = false;
                    model.add(edges);     
                }
            });
            model.position.set(0, 0, 0);
            frame_buffer.setModel(index, model)
        });
    });
}

// wv = WEBViewr()
// // cam = getCamfeed(dfsdhflksdjh)
// wv.loadLoadFBX(fbx)
// for frame in cam:
//     bs, joints, texture = algo(frame)
//     wv.update(bs, joints, texutre)