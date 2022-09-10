from distutils.core import setup
from setuptools import find_packages

setup(name='web_viewer',
      version='1.0',
      description='CG WebViewer',
      author='Amir Day',
      author_email='amir.day@commonground-ai.com',
      url='https://github.com/AmirDayCG/AmirDayCG.github.io',
      packages=find_packages(),
      install_requires=[
        "numpy >= 1.23.1",
        "Pillow >= 9.2.0",
        "protobuf >= 4.21.5",
        "uvloop >= 0.16.0",
        "websockets >= 10.3"
   ],
     )