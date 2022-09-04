import numpy as np
from matplotlib import image

for i in range(10):
    name = f'vertices{str(i).zfill(6)}'
    data = np.load(f'/Users/amirday/Downloads/vid_all_files 2/{name}.npy')
    np.savetxt(f'test_data/{name}', data, delimiter=',')

    name = f'mesh{str(i).zfill(6)}'
    data = image.imread(f'/Users/amirday/Downloads/vid_all_files 2/{name}.png')
    np.savetxt(f'test_data/{name}', (np.pad(data, (0, 1), 'constant', constant_values=(1,1))*255)[:-1, :-1, :].astype(int).ravel(), delimiter=',')