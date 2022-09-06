g_message = undefined
g_reconnection_counter = 0
g_message_counter = 0

function NetworkClient(ip, port) {
    this.ip = ip
    this.port = port
    this.connectionString = "ws://".concat(ip).concat(":").concat(port)
    console.log('connecting to: ' + this.connectionString)
    this.socket = new WebSocket(this.connectionString);
    this.socket.binaryType = 'arraybuffer';

    this.socket.addEventListener('open', function (event){
        g_network_client_open = true;
        console.log('network is connected')
        clearFramesData()
        g_frame_handler = new FramesHandlerLive()

    })

    this.socket.onerror = function(e){
        g_reconnection_counter++;
        if (g_reconnection_counter < 10){
            var ip = this.url.split('//')[1].split(':')[0]
            var port = parseInt(this.url.split('//')[1].split(':')[1])
            g_network = new NetworkClient(ip, port)
            console.log('reconnecting ' + g_reconnection_counter+ '/10 ' + this.connectionString)
            }
        else{
            console.log('Connection fail to: ' + this.connectionString )
            g_reconnection_counter = 0
            }
    }

    this.socket.addEventListener('message', function (event) {
        g_message_counter++
        // console.log(g_message_counter)
        protobuf.load("protobuf_schema/webviewer_v0.proto").then(function(root) {
            
            var bytes = new Uint8Array(event.data);
            var Frame = root.lookupType("webviewer.Frame");
            g_message = Frame.decode(bytes);
            g_frame_handler.handleMessage(g_message)
        })
    })
}