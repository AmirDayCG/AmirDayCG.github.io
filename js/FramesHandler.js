
var modelAndTextures = document.getElementById('modelPlusTexture');
var g_frame_handler = undefined
var g_currently_loading = false

modelAndTextures.addEventListener('change', function (event) {

    var files = event.currentTarget.files;
    g_frame_handler = new FramesHandler(files, objLoaderWrapper)
    document.getElementById("frames_slider").max = String(g_frame_handler.frames_buffer.getIndices().length - 1)
    document.getElementById("frames_slider").value = '0'
});


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

var filsToDictWithIndexAsKey = function(files){
    var files_dict = {}
    for (var i=0; i<files.length; i++){
        var file_index = parseInt(files[i].name.match(/\d+/)[0])
        if (files_dict[file_index] == undefined){
            files_dict[file_index] = {"extra_files": {}}
        }
        if (files[i].name.endsWith('mtl')){
            files_dict[file_index].mtl = files[i].name
        }
        else if (files[i].name.endsWith('obj')){
            files_dict[file_index].obj = files[i].name
        }
        else if (files[i].name.endsWith('png')){
            files_dict[file_index].texture = files[i].name
        }
        files_dict[file_index].extra_files[files[i].name] = files[i]
    }
    return files_dict
}

class FramesBuffer {
    constructor(){
        this.frames_buffer = {}
    }
    initFromFilesList(file_list){
        var files_dict = filsToDictWithIndexAsKey(file_list)
        for (let [key, value] of Object.entries(files_dict)){
            this.frames_buffer[key] = {
                "model": undefined,
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
    init(start_index, end_index){
        for (var i=start_index; i<end_index; i++){
            this.frames_buffer[i] = {
                "model": undefined,
                "path": undefined,
                "fetching": false,
            }
        }
    }
    setModel(index, model){
        this.frames_buffer[index].model = model
        this.frames_buffer.fetching = false
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
    constructor(frames_path_list, loader_function){
        this.loader_function = loader_function
        this.frames_buffer = new FramesBuffer()
        this.frames_buffer.initFromFilesList(frames_path_list)
        this.rendered_index = undefined
    }
    loadIndex(index){
        if (!this.frames_buffer.shouldTryToLoadIndex(index)) return
        this.frames_buffer.markFetching(index)
        this.loader_function(this.frames_buffer.getPath(index), index, this.frames_buffer)
    }
    loadMultipleIndices(start_index, end_index){
        for (var i=start_index%this.frames_buffer.count(); (i<end_index)&&(i<this.frames_buffer.count()) ; i++){
            if (!g_currently_loading){
                this.loadIndex(i)
            }
        }
    }
    getRenderedModel(){
        if (this.rendered_index == undefined) return undefined
        return this.frames_buffer.getModel(this.rendered_index)
    }
    showIndex(index){
        if (index == undefined || index == this.rendered_index) return
        if (this.rendered_index != undefined){
            scene.remove(this.frames_buffer.getModel(this.rendered_index))
        }
        this.rendered_index = index
        scene.add(this.frames_buffer.getModel(index));
    }
}