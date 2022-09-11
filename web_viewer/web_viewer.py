from pathlib import Path
import shutil
import os
import asyncio
import uvloop
import websockets
import multiprocessing
from queue import Empty, Full
from multiprocessing import Queue, freeze_support
import numpy as np
from enum import Enum
from .protobuf_schema import webviewer_v0_pb2 as wv_proto

  
class Materials(Enum):
    PHONG = 0
    

def websocket_handler(ip_string: str, port: int, send_to_client_queue:Queue):
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
    def __init__(self, local_website_hosting=False, dump_dir:Path=None, show:bool=True):
        assert isinstance(dump_dir, Path) or dump_dir is None, 'dump_dir must be type of path (or None)'
        self._frames_counter = 0
        self._dump_dir = dump_dir
        if self._dump_dir != None:
            if self._dump_dir.exists():
                shutil.rmtree(self._dump_dir)
            os.makedirs(self._dump_dir)
        self._show = show      
        self._website_host = 'http://127.0.0.1:5500/' if local_website_hosting else 'https://amirdaycg.github.io/'
        self._python_servet_ip_string = self._get_python_servet_ip_string()
        self._python_servet_port = self._get_python_servet_port()
        self._protobuf_frame_builder = None

        if self._show:
            self._print_connection_string(self._website_host, self._python_servet_ip_string, self._python_servet_port)
            self._to_client_queue = Queue(2)

            self._server_process = multiprocessing.Process(target=websocket_handler, 
            args=(self._python_servet_ip_string, self._python_servet_port, self._to_client_queue, ))
            
            self._server_process.daemon = True
            self._server_process.start()
    
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

    def _build_translation_rotation(self, message_builder, model_translation: np.ndarray = None, model_rotation: np.ndarray = None):
        assert model_rotation is None or model_rotation.ravel().shape == (3,), 'global rotation must be of length 3 (x,y,z)'
        assert model_translation is None or model_translation.ravel().shape == (3,), 'global translation must be of length 3 (x,y,z)'
        if model_rotation is not None:
            message_builder.model_translation.extend(model_translation.astype(float).ravel())
        if model_rotation is not None:
            message_builder.model_rotation.extend(model_rotation.astype(float).ravel())

    def _set_model_from_string(self, model_string:str, model_type:wv_proto.ModelType ,model_id:int, 
            model_translation: np.ndarray = None, model_rotation: np.ndarray = None,
            texture_width:int = None, texture_height:int=None):

        model = self._frame_builder.models.add()
        model.model = model_string
        self._set_model_meta_data(model, model_type=model_type ,model_id=model_id, 
            model_translation=model_translation, model_rotation=model_rotation,
            texture_width=texture_width, texture_height=texture_height)

    def _set_model_meta_data(self, model, model_type:wv_proto.ModelType ,model_id:int, 
            model_translation: np.ndarray = None, model_rotation: np.ndarray = None,
            texture_width:int = None, texture_height:int=None):
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

    def set_obj_from_string(self, obj_string:str, model_id:int, texture_width:int, texture_height:int,
                model_translation: np.ndarray, model_rotation: np.ndarray):
        self._set_model_from_string(model_string=obj_string, model_type=wv_proto.ModelType.OBJ, model_id=model_id, 
        model_translation=model_translation, model_rotation=model_rotation, texture_width=texture_width, 
        texture_height=texture_height)

    def set_obj_from_raw_data(self, faces:np.ndarray, uvs:np.ndarray, faces_to_uv:np.ndarray, vertices:np.ndarray,
                model_id:int, texture_width:int, texture_height:int,
                model_translation: np.ndarray, model_rotation: np.ndarray):
        assert faces.shape[1] == 3, f'faces shape must be N,3 for {faces.shape}'
        assert faces.dtype == np.int, f'face dtype must be int got {faces.dtype}' 

        assert uvs.shape[1] == 2, f'uvs shape must be N,2 for {uvs.shape}'
        assert uvs.dtype == np.float32, f'uvs dtype must be float got {uvs.dtype}' 

        assert faces_to_uv.shape[1] == 3, f'faces_to_uv shape must be N,3 for {faces_to_uv.shape}'
        assert faces_to_uv.dtype == np.int, f'faces_to_uv dtype must be int got {faces_to_uv.dtype}' 

        assert vertices.shape[1] == 3, f'vertices shape must be N,2 for {vertices.shape}'
        assert vertices.dtype == np.float32, f'faces_to_uv dtype must be float32 got {vertices.dtype}' 

        model = self._frame_builder.models.add()
        model.uvs.extend(uvs.ravel())
        model.faces.extend(faces.ravel())
        model.faces_to_uv.extend(faces_to_uv.ravel())
        model.vertices.extend(vertices.ravel())
        self._set_model_meta_data(model, model_type=wv_proto.ModelType.OBJ ,model_id=model_id, 
        model_translation=model_translation, model_rotation=model_rotation,
        texture_width=texture_width, texture_height=texture_height)

    def finish_frame(self):
        self._frames_counter += 1
        message = self._serialize_message()
        if self._show:
            try:
                self._to_client_queue.put(message, timeout=1)
            except Full:
                print('web viwer losing data, is web browser connected?')
        if self._dump_dir is not None:
            file_path = self._dump_dir.joinpath(f'{str(self._frames_counter).zfill(10)}.pb')
            with open(file_path, 'ab') as f:
                f.write(message)
        self._clear_builder()

    def clear_models():
        pass
    
    def set_image_rgb(self, image_data:np.ndarray, image_width:int, image_height:int):
        assert isinstance(image_data, np.ndarray), 'image_data must be type of np.ndarray'
        assert image_data.dtype == np.uint8, 'image_data dtype must be np.uint8'
        assert image_data.shape[2] == 3, f'image data must have rgb channels got shape: {image_data.shape}'
        
        image_data_rgba_flat = (np.pad(image_data, (0, 1), 'constant', constant_values=(1,1)))[:-1, :-1, :].ravel()

        image = self._frame_builder.images.add()
        image.image_data=image_data_rgba_flat.tobytes()
        image.image_width = image_width
        image.image_height = image_height

    def set_image_rgba(self, image_data:np.ndarray, image_width:int, image_height:int):
        assert isinstance(image_data, np.ndarray), 'image_data must be type of np.ndarray'
        assert image_data.dtype == np.uint8, 'image_data dtype must be np.uint8'
        assert image_data.shape[2] == 4, f'image data must have rgba channels got shape: {image_data.shape}'
        
        image_data_rgba_flat = image_data.ravel()

        image = self._frame_builder.images.add()
        image.image_data=image_data_rgba_flat.tobytes()
        image.image_width = image_width
        image.image_height = image_height

    def update_obj(self, id, vertices=None, texture:np.ndarray=None, model_translation:np.ndarray=None, model_rotation:np.ndarray=None):

        obj_update = self._frame_builder.obj_update.add()
        self._build_translation_rotation(message_builder=obj_update, model_translation=model_translation,
        model_rotation=model_rotation)
        obj_update.model_id = id
        if vertices is not None:
            assert isinstance(vertices, np.ndarray), 'vertices must be type of np.ndarray'
            assert vertices.dtype == np.float32, f'vertices dtype must be float got {vertices.dtype}'
            assert vertices.shape[1] == 3, f'ivertices must have shape of [N,3] got shape: {vertices.shape}'
            obj_update.vertices.extend(vertices.ravel())
        if texture is not None:
            assert isinstance(texture, np.ndarray), 'texture must be type of np.ndarray'
            assert texture.dtype == np.uint8, f'texture dtype must be np.uint8 got {texture.dtype}'
            assert texture.shape[2] == 3, f'image data must have rgb channels got shape: {texture.shape}'
            
            texture_data_rgba_flat = (np.pad(texture, (0, 1), 'constant', constant_values=(1,1)))[:-1, :-1, :].ravel()

            obj_update.texture=texture_data_rgba_flat.tobytes()

    def update_fbx(self, blend_shapes: np.ndarray, joints: np.ndarray, texture: np.ndarray, material: Materials, fbx_id: int):
        pass
        


def main():
    import time
    path = Path('/Users/amirday/Desktop/tttt/11/22')
    wv = WebViewer(local_website_hosting=True, show=True, dump_dir=None)
    with open('/Users/amirday/projects/AmirDayCG.github.io/sample_models/005538.obj', 'r') as f:
        obj_model = f.read()
    while True:
        wv.set_obj_from_string(obj_string=obj_model, model_id=1, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([-0.3,0,0]), 
        texture_height=512, texture_width=512)
        wv.set_obj_from_string(obj_string=obj_model, model_id=3, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([0.3,0,0]), 
        texture_height=512, texture_width=512)
        wv.set_obj_from_string(obj_string=obj_model, model_id=4, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([0.3,0.3,0]), 
        texture_height=512, texture_width=512)
        wv.set_obj_from_string(obj_string=obj_model, model_id=2, 
        model_rotation=np.array([0,0,0]), model_translation=np.array([-0.3,0.3,0]), 
        texture_height=512, texture_width=512)
        wv.finish_frame()
        vertices = []
        
        for x in range(3):
            for i in range(100):
                ptime = time.time()
                name = f'vertices{str(i).zfill(6)}'
                vertices = np.load(f'/Users/amirday/Downloads/vid_all_files 2/{name}.npy').ravel()
                

                name = f'mesh{str(i).zfill(6)}'
                texture_image = image.imread(f'/Users/amirday/Downloads/vid_all_files 2/{name}.png')
                texture_imag_2 = texture_image *3
                # texture = (np.pad(texture_image, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(np.uint8).ravel()
                # texture_2 = (np.pad(texture_imag_2, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(np.uint8).ravel()
                print(f'preperation: {time.time() - ptime}')
                pttime = time.time()
                wv.update_obj(1, vertices=vertices, texture=texture_image)
                wv.update_obj(3, vertices=vertices, texture=texture_imag_2)
                wv.update_obj(4, vertices=vertices, texture=texture_imag_2)
                wv.update_obj(2, vertices=vertices, texture=texture_imag_2)
                # wv.set_image(image_data=texture, image_width=512, image_height=512)
                # wv.set_image(image_data=texture_2, image_width=512, image_height=512)
                if (i < 20) or (i>60):
                    wv.set_image_rgb(image_data=texture_imag_2, image_width=512, image_height=512)
                print(f'proto_time: {time.time() - pttime}')
                stime = time.time()
                wv.finish_frame()
                print(f'sending: {time.time() - stime}')
                print(f'total: {time.time() - ptime}')

                a = 1
if __name__ == "__main__":
    main()