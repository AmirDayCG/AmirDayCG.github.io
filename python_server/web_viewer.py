import asyncio
import uvloop
import websockets
import multiprocessing
from queue import Empty, Full
from multiprocessing import Queue, freeze_support
import numpy as np
from enum import Enum
import protobuf_schema.webviewer_v0_pb2 as wv_proto
from matplotlib import image


class Materials(Enum):
    PHONG = 0
    

def websocket_handler(ip_string: str, port: int, send_to_client_queue:Queue):
    # async def hello(websocket, path):
    #     while True:
    #         try:
    #             data = send_to_client_queue.get(block=True, timeout=0.1)
    #         except Empty:
    #             continue
    #         try:
    #             await asyncio.wait_for(websocket.send(data), timeout=1)
    #         except asyncio.TimeoutError:
    #             print('web viwer losing data, is web browser connected?')
    #         # await websocket.send(data)

    async def server_func(websocket, path):
        while True:
            try:
                data = send_to_client_queue.get(block=True, timeout=0.1)
            except Empty:
                continue
            try:
                await websocket.send(data)
                await asyncio.sleep(0) 
            except asyncio.TimeoutError:
                print('web viwer losing data, is web browser connected?')
            # await websocket.send(data)

    loop = uvloop.new_event_loop()
    asyncio.set_event_loop(loop)

    start_server = websockets.serve(server_func, ip_string, port, compression=None)

    loop.run_until_complete(start_server)
    loop.run_forever()


class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class WebViewer(metaclass=Singleton):
    _web_viewer_instance = None
    def __init__(self, frames_to_keep_in_viewer=0, local_website_hosting=False):      
        self._frames_to_keep_in_viewer = frames_to_keep_in_viewer
        self._website_host = 'http://127.0.0.1:5500/' if local_website_hosting else 'https://amirdaycg.github.io/index#/'
        self._python_servet_ip_string = self._get_python_servet_ip_string()
        self._python_servet_port = self._get_python_servet_port()
        self._print_connection_string(self._website_host, self._python_servet_ip_string, self._python_servet_port)
        self._to_client_queue = Queue(2)

        self._server_process = multiprocessing.Process(target=websocket_handler, 
        args=(self._python_servet_ip_string, self._python_servet_port, self._to_client_queue, ))
        
        self._server_process.daemon = True
        self._server_process.start()
        self._protobuf_frame_builder = None
    
    @property
    def _frame_builder(self) -> wv_proto.Frame:
        if self._protobuf_frame_builder == None:
            self._protobuf_frame_builder = wv_proto.Frame()
        return self._protobuf_frame_builder
    
    def _clear_builder(self):
        self._protobuf_frame_builder = None

    def _get_python_servet_ip_string(self):
        return '127.0.0.1'

    def _get_python_servet_port(self):
        return 4000

    def _print_connection_string(self, website_host, python_servet_ip_string, python_servet_port):
        return print(f'{website_host}?ip={python_servet_ip_string}&port={python_servet_port}')

    def set_camera_position(self, x:float, y:float, z:float, rx:float, ry:float, rz:float):
        pass
    
    def update_obj(self, vertices: np.ndarray, texture: np.ndarray, material: Materials, obj_id:int):
        pass

    def _build_translation_rotation(self, message_builder, model_translation: np.ndarray = None, model_rotation: np.ndarray = None):
        assert model_rotation is None or model_rotation.ravel().shape == (3,), 'global rotation must be of length 3 (x,y,z)'
        assert model_translation is None or model_translation.ravel().shape == (3,), 'global translation must be of length 3 (x,y,z)'
        if model_rotation is not None:
            message_builder.model_translation.extend(model_translation.astype(float).ravel())
        if model_rotation is not None:
            message_builder.model_rotation.extend(model_rotation.astype(float).ravel())

    def _set_model(self, model_string:str, model_type:wv_proto.ModelType ,model_id:int, 
                   model_translation: np.ndarray = None, model_rotation: np.ndarray = None,
                   texture_width:int = None, texture_height:int=None):

        model = self._frame_builder.models.add()
        model.model = model_string
        model.model_id = int(model_id)
        model.model_type = model_type
        if texture_width is not None:
            model.texture_width = texture_width
        if texture_height is not None:
            model.texture_height = texture_height
        self._build_translation_rotation(message_builder=model, 
        model_translation=model_translation, model_rotation=model_rotation)

    def _serialize_message(self):
        if self._frame_builder is not None:
            return self._frame_builder.SerializeToString()

    def set_fbx(self, fbx_string:str, fbx_id:int, global_translation: np.ndarray, global_rotation: np.ndarray):
        pass

    def set_obj(self, obj_string:str, model_id:int, texture_width:int, texture_height:int,
                model_translation: np.ndarray, model_rotation: np.ndarray):
        self._set_model(model_string=obj_string, model_type=wv_proto.ModelType.OBJ, model_id=model_id, 
        model_translation=model_translation, model_rotation=model_rotation, texture_width=texture_width, 
        texture_height=texture_height)

    def send_frame(self):
        message = self._serialize_message()
        try:
            self._to_client_queue.put(message, timeout=1)
        except Full:
            print('web viwer losing data, is web browser connected?')
        self._clear_builder()

    def clear_models():
        pass
    
    def update_obj(self, id, vertices=None, texture=None, model_translation:np.ndarray=None, model_rotation:np.ndarray=None):
        obj_update = self._frame_builder.obj_update.add()
        self._build_translation_rotation(message_builder=obj_update, model_translation=model_translation,
        model_rotation=model_rotation)
        obj_update.model_id = id
        if vertices is not None:
            obj_update.vertices.extend(vertices.astype(float).ravel())
        if texture is not None:
            obj_update.texture=texture.tobytes()

    def update_fbx(self, blend_shapes: np.ndarray, joints: np.ndarray, texture: np.ndarray, material: Materials, fbx_id: int):
        pass
        


def main():
    import time
    wv = WebViewer(local_website_hosting=True)
    with open('/Users/amirday/projects/AmirDayCG.github.io/sample_models/005538.obj', 'r') as f:
        obj_model = f.read()
    while True:
        wv.set_obj(obj_string=obj_model, model_id=1, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([-0.3,0,0]), 
        texture_height=512, texture_width=512)
        wv.set_obj(obj_string=obj_model, model_id=3, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([0.3,0,0]), 
        texture_height=512, texture_width=512)
        wv.send_frame()
        vertices = []
        
        for x in range(3):
            for i in range(100):
                ptime = time.time()
                name = f'vertices{str(i).zfill(6)}'
                vertices = np.load(f'/Users/amirday/Downloads/vid_all_files 2/{name}.npy').ravel()
                

                name = f'mesh{str(i).zfill(6)}'
                texture_image = image.imread(f'/Users/amirday/Downloads/vid_all_files 2/{name}.png')
                texture = (np.pad(texture_image, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(np.uint8).ravel()
                print(f'preperation: {time.time() - ptime}')
                pttime = time.time()
                wv.update_obj(1, vertices=vertices, texture=texture)
                print(f'proto_time: {time.time() - pttime}')
                stime = time.time()
                wv.send_frame()
                print(f'sending: {time.time() - stime}')
                print(f'total: {time.time() - ptime}')

                a = 1
if __name__ == "__main__":
    main()