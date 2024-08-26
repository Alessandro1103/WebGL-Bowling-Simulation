function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
    let transl = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];
    let rotX = [
        1, 0, 0, 0,
        0, Math.cos(rotationX), Math.sin(rotationX), 0,
        0, -Math.sin(rotationX), Math.cos(rotationX), 0,
        0, 0, 0, 1
	];
    let rotY = [
        Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
        0, 1, 0, 0,
        Math.sin(rotationY), 0, Math.cos(rotationY), 0,
        0, 0, 0, 1
	];

    let res = MatrixMult(rotY, rotX);
    res = MatrixMult(transl, res);
    return res;
}

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations
		let vertSh = `
			attribute vec4 a_pos;
			attribute vec2 a_texCoord;
			attribute vec3 a_normal;
			
			uniform mat4 u_mvp;
			uniform mat4 u_mv;
			uniform mat3 u_mn;
			
			uniform mat4 u_yzSwapMat;
			uniform mat4 u_projectionMatrix;
			uniform vec3 u_lightDirection;
			
			varying vec2 v_texcoord;
			varying vec3 v_normal;
			varying vec4 v_viewSource;
			
			void main() {
				gl_Position = u_mvp * u_yzSwapMat * a_pos;
				v_viewSource = u_mv * u_yzSwapMat * a_pos;
				v_texcoord = a_texCoord;
				v_normal = normalize(u_mn * mat3(u_yzSwapMat) * a_normal);
			}
		`;

        let fragSh = `
			precision mediump float;
			
			uniform bool u_useTexture; 
			uniform sampler2D u_texture;
			uniform vec3 u_lightDirection;
			uniform float u_shininess;
			
			varying vec4 v_viewSource;
			varying vec3 v_normal;	 
			varying vec2 v_texcoord;
			
			void main() {
				vec3 normal = normalize(v_normal);
		
				u_useTexture ?  gl_FragColor = texture2D(u_texture, v_texcoord) : gl_FragColor = vec4(0.2, 1, 0.2, 1);

				vec3 lightColor = vec3(1.0, 1.0, 1.0);

				// DIFFUSE
				vec3 lightSource = u_lightDirection;
				float diffuse = dot(lightSource, normal);
				
				// SPECULAR
				vec3 viewSourceN = normalize(v_viewSource.xyz);
				vec3 halfVector = normalize(-lightSource + viewSourceN);
				
				float specular = 0.0;
				if (diffuse > 0.0) {
					specular = pow(dot(normal, halfVector), u_shininess);
				}

				gl_FragColor.rgb *= diffuse;
				gl_FragColor.rgb += specular;
			}
		`;
        this.prog = InitShaderProgram(vertSh, fragSh);

        this.mvp = gl.getUniformLocation(this.prog, 'u_mvp');
        this.yzSwapLoc = gl.getUniformLocation(this.prog, 'u_yzSwapMat');
        this.matrixMVLoc = gl.getUniformLocation(this.prog, "u_mv");
        this.matrixNormalLoc = gl.getUniformLocation(this.prog, "u_mn");
        this.shininessLoc = gl.getUniformLocation(this.prog, "u_shininess");
        this.lightDirectionLoc = gl.getUniformLocation(this.prog, "u_lightDirection");
		this.useTextureLoc = gl.getUniformLocation(this.prog, 'u_useTexture');
		this.textureLoc = gl.getUniformLocation(this.prog, 'u_texture');
		
        this.vertPos = gl.getAttribLocation(this.prog, 'a_pos');
        this.texPos = gl.getAttribLocation(this.prog, 'a_texCoord');
        this.normalLocation = gl.getAttribLocation(this.prog, "a_normal");
		
		this.texture = gl.createTexture();
        this.vertexBuffer = gl.createBuffer();
        this.texelsBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
		
        this.numTriangles = 0;
        this.yzSwapMat = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texelsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		this.yzSwapMat = swap ? new Float32Array([
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, 1, 0, 0,
            0, 0, 0, 1
        ]) : new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        gl.useProgram(this.prog);
        gl.uniformMatrix2fv(this.yzSwapLoc, false, this.yzSwapMat);
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.mvp, false, matrixMVP);
        gl.uniformMatrix4fv(this.yzSwapLoc, false, this.yzSwapMat);
        gl.uniformMatrix4fv(this.matrixMVLoc, false, matrixMV);
        gl.uniformMatrix3fv(this.matrixNormalLoc, false, matrixNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.vertPos);
        gl.vertexAttribPointer(this.vertPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texelsBuffer);
        gl.enableVertexAttribArray(this.texPos);
        gl.vertexAttribPointer(this.texPos, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(this.normalLocation);
        gl.vertexAttribPointer(this.normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // You can set the texture image data using the following command.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

        gl.generateMipmap(gl.TEXTURE_2D);

        // [TO-DO] Now that we have a texture, it might be a good idea to set
        // some uniform parameter(s) of the fragment shader, so that it uses the texture.
        gl.useProgram(this.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureLoc, 0);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.prog);
        gl.uniform1i(this.useTextureLoc, show);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
		gl.useProgram(this.prog);
        gl.uniform3fv(this.lightDirectionLoc, [x, y, z]);
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		gl.useProgram(this.prog);
        gl.uniform1f(this.shininessLoc, shininess);
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
    var forces = new Array(positions.length);
    for (var i = 0; i < forces.length; ++i)
        forces[i] = new Vec3(0, 0, 0);

	// [TO-DO] Compute the total force of each particle

	// Gravity
    for (var i = 0; i < positions.length; i++) {
        forces[i] = forces[i].add(gravity.mul(particleMass));
    }
	
	// Spring
	for (var i = 0; i < springs.length; i++) {
		let pos0 = positions[springs[i].p0];
		let pos1 = positions[springs[i].p1];
		let vel0 = velocities[springs[i].p0];
		let vel1 = velocities[springs[i].p1];
		let displacement = pos1.sub(pos0);

		let direction = displacement.unit();

		let stretch = displacement.len() - springs[i].rest;
		let relativeVelocity = vel1.sub(vel0);
		
		let Fs = direction.mul(stretch * stiffness);
		let Fd = direction.mul(relativeVelocity.dot(direction) * damping);

		forces[springs[i].p0] = forces[springs[i].p0].add(Fs.add(Fd));
		forces[springs[i].p1] = forces[springs[i].p1].sub(Fs.add(Fd));
	}

	// [TO-DO] Update positions and velocities
    for (var i = 0; i < positions.length; i++) {
        let acc = forces[i].div(particleMass);
        velocities[i] = velocities[i].add(acc.mul(dt));
        positions[i] = positions[i].add(velocities[i].mul(dt));
    }

	// [TO-DO] Handle collisions
	for (var i = 0; i < positions.length; i++) {
		if (Math.abs(positions[i].x) > 1) {
			positions[i].x = Math.sign(positions[i].x);
			velocities[i].x *= -restitution;
		} 
		if (Math.abs(positions[i].y) > 1) {
			positions[i].y = Math.sign(positions[i].y);
			velocities[i].y *= -restitution;
		} 
		if (Math.abs(positions[i].z) > 1) {
			positions[i].z = Math.sign(positions[i].x);
			velocities[i].z *= -restitution;
		} 
	}
	

}

