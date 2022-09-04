const _face_vertex_data_separator_pattern = /\s+/;

class OBJSlimLoader extends THREE.Loader {
    constructor( manager ) {

        super( manager );
        this.vertices = []
        this.faces = []
        this.faces2uvs = []
        this.uvs = []
    }
    load( url, onLoad, onProgress, onError ) {

        const scope = this;
        const loader = new THREE.FileLoader( this.manager );
        loader.setPath( this.path );
        loader.setRequestHeader( this.requestHeader );
        loader.setWithCredentials( this.withCredentials );
        loader.load( url, function ( text ) {

            try {

                onLoad( scope.parse( text ) );

            } catch ( e ) {

                if ( onError ) {

                    onError( e );

                } else {

                    console.error( e );

                }

                scope.manager.itemError( url );

            }

        }, onProgress, onError );
    }
    parse(text){
        if ( text.indexOf( '\r\n' ) !== - 1 ) {

            // This is faster than String.split with regex that splits on both
            text = text.replace( /\r\n/g, '\n' );

        }

        if ( text.indexOf( '\\\n' ) !== - 1 ) {

            // join lines separated by a line continuation character (\)
            text = text.replace( /\\\n/g, '' );

        }

        const lines = text.split( '\n' );
        for ( let i = 0, l = lines.length; i < l; i ++ ) {
            const line = lines[ i ].trimStart();
            if ( line.length === 0 ) continue;
            const lineFirstChar = line.charAt( 0 ); // @todo invoke passed in handler if any

            if ( lineFirstChar === '#' ) continue;

            if ( lineFirstChar === 'v' ) {
                const data = line.split( _face_vertex_data_separator_pattern );
                switch ( data[ 0 ] ) {
                    case 'v':
                        this.vertices.push( parseFloat( data[ 1 ] ), parseFloat( data[ 2 ] ), parseFloat( data[ 3 ] ) );
                        break
                    case 'vt':
                        this.uvs.push( parseFloat( data[ 1 ] ), parseFloat( data[ 2 ] ) );
                        break
                }
            }
            if ( lineFirstChar === 'f' ) {
                const lineData = line.slice( 1 ).trim();
                const vertexData = lineData.split( _face_vertex_data_separator_pattern );
                for ( let j = 0, jl = vertexData.length; j < jl; j ++ ) {

                    const vertex = vertexData[ j ];

                    if ( vertex.length > 0 ) {
                        const vertexParts = vertex.split( '/' );
                        this.faces.push(this.mapObjIndex(parseInt(vertexParts[0])));
                        this.faces2uvs.push(this.mapObjIndex(parseInt(vertexParts[1])))
                    }
                } 
            }
        }
        const obj_model = new OBJModel(this.faces, this.faces2uvs, this.uvs, materials.default_material.clone(), undefined, undefined)
        obj_model.UpdateOrCreate(this.vertices, undefined)
        // const object_geometry = CreateGeometryFromVerticesFacesUvs(this.vertices, this.faces, this.faces2uvs, this.uvs)
        return obj_model
    }
    mapObjIndex(index){
        return index - 1
    }
}



class OBJModel{
    constructor(faces, faces2uvs, uvs, material, texture_width, texture_height){
        this.faces = faces
        this.faces2uvs = faces2uvs
        this.uvs = uvs
        this.geometry = undefined
        this.material = material
        this.obj = undefined
        this.texture_height = texture_height
        this.texture_width = texture_width

    }
    WasCreated(){
        return this.obj != undefined
    }
    UpdateOrCreate(vertices, texture){
        if (this.obj == undefined && vertices == undefined){
            return
        }
        if (this.obj != undefined && vertices != undefined){
            this.UpdateGeometrVertices(vertices)
        }
        if (this.obj != undefined && texture != undefined){
            this.UpdateTextureFromBuffer(texture)
        }
        if (this.obj == undefined && vertices != undefined){
            this.CreateGeometryFromVerticesFacesUvs(vertices)
            this.CreateObject()
        }
    }
    CreateObject(){
        this.obj = CreateObject(this.geometry, this.material)
    }
    CreateGeometryFromVerticesFacesUvs(vertices){
        this.geometry = 
        CreateGeometryFromVerticesFacesUvs(vertices, this.faces, this.faces2uvs, this.uvs)
    }
    UpdateGeometrVertices(vertices){
        UpdateGeometrVertices(vertices, this.obj)
    }
    UpdateTextureFromBuffer(data){
        UpdateTextureFromBuffer(data, this.texture_width, this.texture_height, this.obj)
    }
}



function CreateObject(geometry, materials){
    const loaded_object = new THREE.Mesh(geometry, materials);
    return loaded_object
}

function CreateGeometryFromVerticesFacesUvs(vertices, faces, faces2uvs, uvs){
    const duplicated_vertices_index = []
    const faces_with_duplicated_vertices = []
    const geometry_uvs = new Array(vertices.length/3*2).fill(-1);
    const extra_new_geometry_uvs = []
    for (var fv=0; fv<faces2uvs.length; fv++){
        if (geometry_uvs[2*faces[fv]] == -1 || geometry_uvs[2*faces[fv]] == uvs[2*faces2uvs[fv]]){
            geometry_uvs[2*faces[fv]] = uvs[2*faces2uvs[fv]]
            geometry_uvs[2*faces[fv] + 1] = uvs[2*faces2uvs[fv]+1]
            faces_with_duplicated_vertices.push(faces[fv])
        }
        else{
            duplicated_vertices_index.push(faces[fv])
            faces_with_duplicated_vertices.push(vertices.length/3 + duplicated_vertices_index.length - 1)
            extra_new_geometry_uvs.push(uvs[2*faces2uvs[fv]])
            extra_new_geometry_uvs.push(uvs[2*faces2uvs[fv]+1])
        }
    }

    const buffergeometry_non_duplicated = new THREE.BufferGeometry();
    buffergeometry_non_duplicated.setIndex(faces)
    buffergeometry_non_duplicated.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    buffergeometry_non_duplicated.computeVertexNormals()

    var new_vertics = vertices    
    var normal = buffergeometry_non_duplicated.attributes.normal.array
    var new_normal =  Array.from(normal);
    var new_uvs = geometry_uvs.concat(extra_new_geometry_uvs)
    for (var nv=0; nv<duplicated_vertices_index.length; nv++){
        new_vertics.push(vertices[3*duplicated_vertices_index[nv]])
        new_vertics.push(vertices[3*duplicated_vertices_index[nv]+1])
        new_vertics.push(vertices[3*duplicated_vertices_index[nv]+2])

        new_normal.push(normal[3*duplicated_vertices_index[nv]])
        new_normal.push(normal[3*duplicated_vertices_index[nv]+1])
        new_normal.push(normal[3*duplicated_vertices_index[nv]+2])
    }

    const buffergeometry = new THREE.BufferGeometry();
    buffergeometry.userData.duplicated_vertices_index = duplicated_vertices_index
    buffergeometry.setIndex(faces_with_duplicated_vertices)
    buffergeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( new_vertics, 3 ) );
    buffergeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( new Float32Array(new_uvs), 2 ) );
    buffergeometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( new Float32Array(new_normal), 3 ) );
    return buffergeometry

}


function UpdateGeometrVertices(vertices, object){
    var obj_geom = object.geometry
    var vertices_count = vertices.length/3
    var normal = Array.from(obj_geom.attributes.normal.array)
    var duplicated_vertices_index = obj_geom.userData.duplicated_vertices_index
    for (var nv=0; nv<duplicated_vertices_index.length; nv++){
        vertices.push(vertices[3*duplicated_vertices_index[nv]])
        vertices.push(vertices[3*duplicated_vertices_index[nv]+1])
        vertices.push(vertices[3*duplicated_vertices_index[nv]+2])

        normal[vertices[3*duplicated_vertices_index[nv]]] = normal[3*vertices_count + 3*nv]
        normal[vertices[3*duplicated_vertices_index[nv]] + 1] = normal[3*vertices_count + 3*nv + 1]
        normal[vertices[3*duplicated_vertices_index[nv]] + 2] = normal[3*vertices_count + 3*nv + 2]
    }

    object.geometry.attributes.position = new THREE.Float32BufferAttribute( vertices, 3 )
    object.geometry.attributes.position.needsUpdate = true

    object.geometry.attributes.normal = new THREE.Float32BufferAttribute( normal, 3 )
    object.geometry.attributes.normal.needsUpdate = true
}

function UpdateTextureFromBuffer(data, width, height, object){
    const texture = new THREE.DataTexture( data, width, height );
    texture.flipY = true
    texture.needsUpdate = true;
    object.material.map = texture
    object.material.needsUpdate = true
}