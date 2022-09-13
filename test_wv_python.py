from web_viewer.web_viewer import WebViewer
from pathlib import Path
import numpy as np
from matplotlib import image


# pip install git+https://github.com/AmirDayCG/AmirDayCG.github.io

import time
if __name__ == '__main__': 
    path = Path('/Users/amirday/Desktop/tttt/11/22')
    wv = WebViewer(local_website_hosting=False, show=True, dump_dir=None)
    data = np.load('/Users/amirday/Desktop/flame_texture_data_v6.pkl', allow_pickle=True)
    name = f'vertices{str(0).zfill(6)}'
    verticesss = np.load(f'/Users/amirday/Downloads/vid_all_files 2/{name}.npy')

    # wv.set_obj_from_raw_data(faces = data['f_plus'], faces_to_uv=data['ft_plus'], 
    # uvs=data['vt_plus'], vertices=vertices, model_id=1, 
    #     model_rotation=np.array([0,0,0]), model_translation=np.array([-0.3,0,0]), 
    #     texture_height=512, texture_width=512)
    # wv.finish_frame()
    with open('/Users/amirday/projects/AmirDayCG.github.io/sample_models/005538.obj', 'r') as f:
        obj_model = f.read()
    while True:
        wv.set_obj_from_raw_data(faces = data['f_plus'], faces_to_uv=data['ft_plus'], 
        uvs=data['vt_plus'], vertices=verticesss, model_id=1, 
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
                vertices = np.load(f'/Users/amirday/Downloads/vid_all_files 2/{name}.npy')
                

                name = f'mesh{str(i).zfill(6)}'
                texture_image = image.imread(f'/Users/amirday/Downloads/vid_all_files 2/{name}.png')*255
                texture_imag_2 = texture_image *3
                texture_image = texture_image.astype(np.uint8)
                texture_imag_2 = texture_imag_2.astype(np.uint8)
                # texture = (np.pad(texture_image, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(np.uint8).ravel()
                # texture_2 = (np.pad(texture_imag_2, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(np.uint8).ravel()
                print(f'preperation: {time.time() - ptime}')
                pttime = time.time()
                wv.update_obj(1, vertices=vertices, texture=texture_image)
                # wv.update_obj(3, vertices=vertices, texture=texture_imag_2)
                # wv.update_obj(4, vertices=vertices, texture=texture_imag_2)
                # wv.update_obj(2, vertices=vertices, texture=texture_imag_2)
                # wv.set_image(image_data=texture, image_width=512, image_height=512)
                # wv.set_image(image_data=texture_2, image_width=512, image_height=512)
                # if (i < 20) or (i>60):
                #     wv.set_image_rgb(image_data=texture_imag_2, image_width=512, image_height=512)
                print(f'proto_time: {time.time() - pttime}')
                stime = time.time()
                wv.finish_frame()
                print(f'sending: {time.time() - stime}')
                print(f'total: {time.time() - ptime}')

                a = 1