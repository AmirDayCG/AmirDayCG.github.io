
var modelAndTextures = document.getElementById('modelPlusTexture');
var g_frame_handler = undefined
var g_currently_loading = false
var g_currently_loading_texture = false

modelAndTextures.addEventListener('change', function (event) {

    var files = event.currentTarget.files;
    updateFrameHandlerAndSlider(files)
});

var updateFrameHandlerAndSlider = function(files){
    clearFramesData()
    g_frame_handler = new FramesHandler()
    g_frame_handler.initFromFilesListFromUser(files)
    document.getElementById("frames_slider").max = String(g_frame_handler.frames_buffer.getIndices().length)
    document.getElementById("frames_slider").value = '1'
}

var updateFrameHandlerAndSlider2 = function(files){
    clearFramesData()
    g_frame_handler = new FramesHandlesFromDumpMasseges()
    g_frame_handler.populateFromFiles(files)
    document.getElementById("frames_slider").max = String(g_frame_handler.frames_buffer.getIndices().length)
    document.getElementById("frames_slider").value = '1'
}

var clearTextureView = function(){
    document.getElementById('texture_view').innerHTML = ''
}
var updateFrameHandlerAndSliderLocal = function(files){
    clearFramesData()
    g_frame_handler = new FramesHandler()
    g_frame_handler.initFromFilesListLocal(files)
    document.getElementById("frames_slider").max = String(g_frame_handler.frames_buffer.getIndices().length)
    document.getElementById("frames_slider").value = '1'
}

var clearSceneFromModels = function(){
    for (var m=0; m<scene.children.length; m++){
        if (scene.children[m].name == 'model'){
            scene.remove(scene.children[m])
        }
    }
}
var clearTextureImage = function(){
    var txt = document.getElementsByName('texture_image')
    for (var t=0; t<txt.length; t++){
        txt[t].src = ''
    }
}

var clearVideo = function(){
    document.getElementById('video_player').src = ''
}

var clearFramesData = function(){
    clearSceneFromModels()
    clearTextureImage()
    clearVideo()

}

var sortFilesByIndex = function (files){
    var file_list = []
    for (var i=0; i<files.length; i ++){
        file_list.push(files[i])
    }
    file_list.sort(function (a, b){
        var a_ = parseInt(a.name.match(/\d+/)[0])
        var b_ = parseInt(b.name.match(/\d+/)[0])
        return a_ - b_
    })
    return file_list
}

var convertFilesDictToURLS = function(files_dict){
    for (let [index, frame_files] of Object.entries(files_dict)){
        for (let [file_type, file_path] of Object.entries(frame_files)){
            if (typeof(file_path) == 'object'){
                files_dict[index][file_type] = URL.createObjectURL(file_path)
            }
        } 
    }
}
var filsToDictWithIndexAsKey = function(files, obj_loader_function){
    var files_dict = {}
    for (var i=0; i<files.length; i++){
        if (files[i].name.endsWith('mp4')){
            updateVideo(files[i])
            continue
        }
        // console.log(files[i].name)
        var file_index_str = files[i].name.match(/\d+/)
        if (file_index_str == null) continue
        var file_index = parseInt(file_index_str[0])
        if (files_dict[file_index] == undefined){
            files_dict[file_index] = {"index": file_index}
        }

        if (files[i].name.endsWith('mtl')){
            files_dict[file_index].mtl = files[i];
        }
        else if (files[i].name.endsWith('obj')){
            files_dict[file_index].obj= files[i];
            files_dict[file_index].load_function = obj_loader_function
        }
        else if (files[i].name.endsWith('png') || files[i].name.endsWith('jpg')){
            files_dict[file_index].texture = files[i];
        }
    }
    var sorted_indices = Object.keys(files_dict).map((x)=>{return parseInt(x)}).sort(function (a, b) {  return a - b;  })
    var out_files_dict = {}
    for (var i=0; i<sorted_indices.length; i++){
        out_files_dict[i] = files_dict[sorted_indices[i]]
    }
    return out_files_dict
}

class FramesBuffer {
    constructor(){
        this.frames_buffer = {}
    }
    initFromFilesListFromUser(file_list){
        var files_dict = filsToDictWithIndexAsKey(file_list, objLoaderWrapper)
        convertFilesDictToURLS(files_dict)

        for (let [key, value] of Object.entries(files_dict)){
            this.frames_buffer[key] = {
                "model": undefined,
                "load_function": value.load_function,
                "path": value,
                "fetching": false,
            }
        }
    }
    initFromFilesListLocal(file_list){
        var files_dict = filsToDictWithIndexAsKey(file_list, objLoaderWrapperLocal)

        for (let [key, value] of Object.entries(files_dict)){
            this.frames_buffer[key] = {
                "model": undefined,
                "load_function": value.load_function,
                "path": value,
                "fetching": false,
            }
        }
    }
    getIndices(){
        return Object.keys(this.frames_buffer)
    }
    count(){
        return this.getIndices().length
    }
    setModel(index, model){
        this.frames_buffer[index].model = model
        this.frames_buffer[index].fetching = false
    }
    getPath(index){
        if (this.frames_buffer[index] == undefined){
            return undefined
        }
        else{
            return this.frames_buffer[index].path
        }
    }
    getModel(index){
        if (this.frames_buffer[index] == undefined){
            return undefined
        }
        else{
            return this.frames_buffer[index].model
        }
    }
    getLoadFunction(index){
        if (this.frames_buffer[index] == undefined){
            return undefined
        }
        else{
            return this.frames_buffer[index].load_function
        }
    }
    isAvailable(index){
        if (this.frames_buffer[index] == undefined){
            return false
        }
        else{
            return this.frames_buffer[index].model != undefined
        }
    }
    shouldTryToLoadIndex(index){
        if (this.frames_buffer[index] == undefined){
            return false
        }
        else{
            return this.frames_buffer[index].model == undefined && this.frames_buffer[index].fetching == false
        }
    }
    getFeatchingStatus(index){
        if (this.frames_buffer[index] == undefined){
            return undefined
        }
        else{
            return this.frames_buffer[index].fetching 
        }
    }
    markFetching(index){
        if (this.frames_buffer[index] != undefined){
            this.frames_buffer[index].fetching = true
        }
    }
}


class FramesHandler{
    constructor(){
        this.frames_buffer = new FramesBuffer()
        this.rendered_index = undefined
        this.frame_time_counter = 0
        this.buffer_depth = 0
        clearTextureView()
        addTextureImage('0')
    }
    initFromFilesListFromUser(frames_path_list){
        this.frames_buffer.initFromFilesListFromUser(frames_path_list)
    }
    initFromFilesListLocal(frames_path_list){
        this.frames_buffer.initFromFilesListLocal(frames_path_list)
    }
    loadIndex(index){
        if (!this.frames_buffer.shouldTryToLoadIndex(index)) return
        this.frames_buffer.markFetching(index)
        this.frames_buffer.getLoadFunction(index)(index, this.frames_buffer)
    }
    loadMultipleIndices(start_index, end_index){
        for (var i=start_index%this.frames_buffer.count(); (i<end_index)&&(i<this.frames_buffer.count()) ; i++){
            if (!g_currently_loading && !g_currently_loading_texture){
                this.loadIndex(i)
            }
        }
    }
    getRenderedModel(){
        if (this.rendered_index == undefined) return undefined
        return this.frames_buffer.getModel(this.rendered_index)
    }
    reShow(){
        this.showIndex(this.rendered_index)
    }
    showIndex(index){
        if (index == undefined || index == this.rendered_index) return
        if (this.rendered_index != undefined){
            scene.remove(this.frames_buffer.getModel(this.rendered_index))
        }
        this.rendered_index = index
        var model = this.frames_buffer.getModel(index)
        scene.add(model);
        if (document.getElementsByName('texture_image').length > 0){
        document.getElementsByName('texture_image')[0].src = model.children[0].userData.material.map.source.data.src
        }
        three_stats.update()
    }
    updateUV(){
        var model = this.getRenderedModel()
        if(document.getElementById('show_texture').checked &
        document.getElementById('draw_uvs_on_texture').checked){
            for (var m=0; m<model.children.length; m++) {
                var faces = model.children[m].geometry.index.array
                var uvs = model.children[m].geometry.attributes.uv.array 
                this.updateUVmapVizualizationOnTextureImage(faces, uvs, document.getElementById('texture_container_'+String(0)).getElementsByName("uv_image")[0])
            }
        }
    }
    clearUVImage(image){
        for (var i=0; i<image.length; i++){
            var ctx = image[i].getContext("2d")
            ctx.clearRect(0, 0, image[i].width, image[i].height)
        }
    }
    updateUVmapVizualizationOnTextureImage(faces, uvs, image){
        this.clearUVImage(image)
        var ctx = image.getContext("2d")
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        var width = image.width
        var height = image.height
        for (var f=0; f<faces.length/3; f++){
            var triangle = []
            var uv_00 = uvs[2*faces[3*f]]
            var uv_01 = uvs[2*faces[3*f]+1] 
            triangle.push([uv_00, uv_01])           
            var uv_10 = uvs[2*faces[3*f+1]]
            var uv_11 = uvs[2*faces[3*f+1]+1]
            triangle.push([uv_10, uv_11])           
            var uv_20 = uvs[2*faces[3*f+2]]
            var uv_21 = uvs[2*faces[3*f+2]+1]
            triangle.push([uv_20, uv_21]) 
            // pushing the first point again to close the triangle          
            triangle.push([uv_00, uv_01])           
            for (var p=0; p<3; p++){
                ctx.beginPath();
                ctx.moveTo(triangle[p][0]*width, (1-triangle[p][1])*height);
                ctx.lineTo(triangle[p+1][0]*width, (1-triangle[p+1][1])*height);
                ctx.stroke();
            }
        }
    }
    updateStats(){
        if (this.rendered_index == undefined) return
        stats(this.frames_buffer.getPath(this.rendered_index).index, 
        this.getRenderedModel().children[0].geometry.attributes.position.count, 1)
    }
    animate(){
        
        this.frame_time_counter+= g_delta
        var current_index = parseInt(document.getElementById("frames_slider").value) - 1
        if (g_play && current_index == this.rendered_index && this.frame_time_counter > g_frame_time_target){
            var val = parseInt(document.getElementById("frames_slider").value)
            var max = parseInt(document.getElementById("frames_slider").max)
            document.getElementById("frames_slider").value = String((val+1)%max)
            this.frame_time_counter = this.frame_time_counter % g_frame_time_target
        }
        var current_index = parseInt(document.getElementById("frames_slider").value) - 1
        if (!g_video_is_playing){
        showVideoTimeStamp(current_index/15)
        }
        this.loadMultipleIndices(current_index, current_index+this.buffer_depth+1)        
        if(this.frames_buffer.isAvailable(current_index)){
            this.showIndex(current_index)
        }
    }
}

class FramesHandlerLive{
    constructor(){
        this.models = {}
        this.models_group = new THREE.Group()
        this.models_group.name = 'model'
        this.frames_counter = 0
        this.last_message = undefined
    }
    getRenderedModel(){
        return this.models_group
    }
    updateStats(){
        var models_count = 0
        var faces_count = 0
        for (const [key, value] of Object.entries(this.models)) {
            faces_count = faces_count + value.obj.geometry.attributes.position.count
            models_count++
          }
        stats(this.frames_counter, faces_count, models_count)
    }
    LoadObjModelFromRawData(faces, uvs, faces2uvs, vertices, id, texture_width, texture_height, translation, rotation){
        var obj = new OBJModel(faces, faces2uvs, uvs, materials.default_material.clone(), texture_width, texture_height)
        obj.UpdateOrCreate(vertices, undefined)

        if(translation != undefined){
            obj.obj.position.set(translation[0], translation[1], translation[2])
        }
        if (rotation!=undefined){
            obj.obj.rotation.set(rotation[0], rotation[1], rotation[2])
        }
        this.models[id] = obj
        clearTextureView()
        this.createTextureContainers()
        // every loaded object remove and re-add the models
        scene.remove(this.models_group)
        this.models_group = new THREE.Group()
        for (const [key, value] of Object.entries(this.models)) {
            this.models_group.add(value.obj)
          }
        scene.add(this.models_group)
    }

    LoadObjModelFromString(model_string, id, texture_width, texture_height, translation, rotation){
        var blob = new Blob([model_string], { type: 'text/plain' });
        var loader = new OBJSlimLoader(manager);
        var scope = this
        loader.load(URL.createObjectURL(blob), function(obj) {
            obj.texture_height = texture_height
            obj.texture_width = texture_width
            if(translation != undefined){
                obj.obj.position.set(translation[0], translation[1], translation[2])
            }
            if (rotation!=undefined){
                obj.obj.rotation.set(rotation[0], rotation[1], rotation[2])
            }
            scope.models[id] = obj
            clearTextureView()
            scope.createTextureContainers()
            // every loaded object remove and re-add the models
            scene.remove(scope.models_group)
            scope.models_group = new THREE.Group()
            for (const [key, value] of Object.entries(scope.models)) {
                scope.models_group.add(value.obj)
              }
            scene.add(scope.models_group)
        })
    }
    reShow(){
        this.handleMessage(this.last_message)
    }
    updateObjModel(id, vertices, texture){
        if (this.models[id] != undefined){
            this.models[id].UpdateOrCreate(vertices, texture)
            if (texture != undefined){
                var texture_container = document.getElementById('texture_container_' + String(id))
                var ctx = texture_container.getElementsByName('texture_canvas_hidden')[0].getContext("2d");
                texture_container.getElementsByName('texture_canvas_hidden')[0].width = this.models[id].texture_width
                texture_container.getElementsByName('texture_canvas_hidden')[0].height = this.models[id].texture_height
                var dataImage = ctx.createImageData(this.models[id].texture_width, this.models[id].texture_height);
                dataImage.data.set(texture);
                ctx.putImageData(dataImage, 0, 0);
                var ctx_viz = texture_container.getElementsByName('texture_canvas')[0].getContext("2d");
                ctx_viz.drawImage(texture_container.getElementsByName('texture_canvas_hidden')[0], 0, 0, this.models[id].texture_width, this.models[id].texture_height,
                 0,0,
                 texture_container.getElementsByName('texture_canvas')[0].width,
                 texture_container.getElementsByName('texture_canvas')[0].height);
            }
        }
    }
    createTextureContainers(){
        for (const [key, value] of Object.entries(this.models)) {
            addTextureImage(String(key))
        } 
    }
    handleMessage(message){
        this.last_message = message
        three_stats.update()
        if (message == undefined) return
        if (message.models != undefined){
            for (var m=0; m<message.models.length; m++ ){
                var model = message.models[m]
                if (model.model != ''){
                    this.LoadObjModelFromString(model.model, model.modelId, model.textureWidth, 
                        model.textureHeight, model.modelTranslation, model.modelRotation)
                }
                if (model.faces != undefined){
                    this.LoadObjModelFromRawData(model.faces, model.uvs, model.facesToUv, model.vertices, 
                        model.modelId, model.textureWidth, 
                        model.textureHeight, model.modelTranslation, model.modelRotation)
                }
            }
        }
        if (message.objUpdate != undefined){
            for (var f=0; f<message.objUpdate.length; f++){
                this.frames_counter++
                var obj_update = message.objUpdate[f]
                this.updateObjModel(obj_update.modelId, obj_update.vertices, obj_update.texture)
            }
        }
        if (message.images != undefined &&  $('#show_video')[0].checked ){
            this.createOrRemoveImagesAccordingToMessage(message)
            for (var i=0; i<message.images.length; i++){
                var image_data = message.images[i].imageData
                var image_width = message.images[i].imageWidth
                var image_height = message.images[i].imageHeight
                this.updateImage(i, image_data, image_width, image_height)
            }
        }
    }

    updateImage(id, image_data, image_width, image_height){
        var image_container = document.getElementById('image_container_' + String(id))
        var ctx = image_container.getElementsByName('image_canvas_hidden')[0].getContext("2d");
        image_container.getElementsByName('image_canvas_hidden')[0].width = image_width
        image_container.getElementsByName('image_canvas_hidden')[0].height = image_height
        var dataImage = ctx.createImageData(image_width, image_height);
        dataImage.data.set(image_data);
        ctx.putImageData(dataImage, 0, 0);
        var ctx_viz = image_container.getElementsByName('image_canvas')[0].getContext("2d");
        ctx_viz.drawImage(image_container.getElementsByName('image_canvas_hidden')[0], 0, 0, 
        image_width, image_height,0,0,
        image_container.getElementsByName('image_canvas')[0].width,
        image_container.getElementsByName('image_canvas')[0].height);
    }
    
    createOrRemoveImagesAccordingToMessage(message){
        var image_views_count = document.getElementById('image_view').children.length
        for (var c=image_views_count-1; c>=message.images.length; c--){
            document.getElementById('image_view').removeChild(document.getElementById('image_view').children[c])
        }
        for (var c=document.getElementById('image_view').children.length; c<message.images.length; c++){
            addImage(String(c))
        }

    }
    updateUV(){
        var model = this.getRenderedModel()
        if(document.getElementById('show_texture').checked &
        document.getElementById('draw_uvs_on_texture').checked){
            var faces = model.children[0].geometry.index.array
            var uvs = model.children[0].geometry.attributes.uv.array 
            this.updateUVmapVizualizationOnTextureImage(faces, uvs, document.getElementsByName("uv_image"))
        }
    }
    clearUVImage(image){
        var ctx = image.getContext("2d")
        ctx.clearRect(0, 0, image.width, image.height)
    }
    updateUVmapVizualizationOnTextureImage(faces, uvs, images){
        for (var i=0; i<images.length; i++){
            var image = images[i]
            this.clearUVImage(image)
            var ctx = image.getContext("2d")
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            var width = image.width
            var height = image.height
            for (var f=0; f<faces.length/3; f++){
                var triangle = []
                var uv_00 = uvs[2*faces[3*f]]
                var uv_01 = uvs[2*faces[3*f]+1] 
                triangle.push([uv_00, uv_01])           
                var uv_10 = uvs[2*faces[3*f+1]]
                var uv_11 = uvs[2*faces[3*f+1]+1]
                triangle.push([uv_10, uv_11])           
                var uv_20 = uvs[2*faces[3*f+2]]
                var uv_21 = uvs[2*faces[3*f+2]+1]
                triangle.push([uv_20, uv_21]) 
                // pushing the first point again to close the triangle          
                triangle.push([uv_00, uv_01])           
                for (var p=0; p<3; p++){
                    ctx.beginPath();
                    ctx.moveTo(triangle[p][0]*width, (1-triangle[p][1])*height);
                    ctx.lineTo(triangle[p+1][0]*width, (1-triangle[p+1][1])*height);
                    ctx.stroke();
                }
            }
        }
    }
    animate(){

    }
}


class FramesHandlesFromDumpMasseges extends FramesHandlerLive{
    populateFromFiles(files){
        this.files = sortFilesByIndex(files)
    }
    getIndices(){
        return [...Array(this.files.length).keys()]
    }
    animate(){
        scope = this
        var message_file = this.files[this.frames_counter%this.files.length]
        var reader = new FileReader();
        reader.onload = function(event) {
          console.log(event.target.result);
          scope.handleMessage(event.target.result)            
        }
        reader.readAsBinaryString(message_file)
    }
}
function putImageData(ctx, imageData, dx, dy,
    dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
  const data = imageData.data;
  const height = imageData.height;
  const width = imageData.width;
  dirtyX = dirtyX || 0;
  dirtyY = dirtyY || 0;
  dirtyWidth = dirtyWidth !== undefined? dirtyWidth: width;
  dirtyHeight = dirtyHeight !== undefined? dirtyHeight: height;
  const limitBottom = dirtyY + dirtyHeight;
  const limitRight = dirtyX + dirtyWidth;
  for (let y = dirtyY; y < limitBottom; y++) {
    for (let x = dirtyX; x < limitRight; x++) {
      const pos = y * width + x;
      ctx.fillStyle =
        `rgba(${data[pos*4+0]}, ${data[pos*4+1]}, ${data[pos*4+2]}, ${data[pos*4+3]/255})`;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
}
