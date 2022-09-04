const manager = new THREE.LoadingManager();

manager.onStart = function(url){
    g_currently_loading = true
}
manager.onLoad = function(){
    g_currently_loading = false
}

function objLoaderWrapper(index, frame_buffer){
    loadObjAndMaterial(frame_buffer.frames_buffer[index].path.obj, frame_buffer.frames_buffer[index].path.texture, index, frame_buffer)
}

function objLoaderWrapperLocal(index, frame_buffer){
    loadObjAndMaterial(frame_buffer.frames_buffer[index].path.obj.name, frame_buffer.frames_buffer[index].path.texture.name, index, frame_buffer)

}
function loadObjAndMaterial(obj_path, texture_path, index, frame_buffer){ 
    var loader = new OBJSlimLoader(manager);
    loader.load(obj_path, function (obj) {
        let txt_loader = new THREE.TextureLoader(manager)
        txt_loader.load(texture_path, function(txt){
                var group = new THREE.Group()
                group.name = 'model'
                var model = obj.obj;
                var my_mtl = materials.default_material.clone()

                my_mtl.map = txt
                model.material = my_mtl
                model.userData.material = my_mtl

                model.position.set(0, 0, 0);
                group.add(model)
                frame_buffer.setModel(index, group)
            }
        )
    });
}