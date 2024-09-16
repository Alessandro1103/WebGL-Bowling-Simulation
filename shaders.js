const lightViewVS = `
    attribute vec3 pos;
    uniform mat4 mvp;
    void main()
    {
        gl_Position = mvp * vec4(pos,1);
    }
`;
const lightViewFS = `
    precision mediump float;
    uniform vec3 clr1;
    uniform vec3 clr2;
    void main()
    {
        gl_FragColor = gl_FrontFacing ? vec4(clr1,1) : vec4(clr2,1);
    }
`;

const SkyVS = `
	attribute vec4 a_position;
	varying vec4 v_position;
	void main() {
		v_position = a_position;
		gl_Position = a_position;
		gl_Position.z = 1.0;
	}
`;

const SkyFS = `
	precision mediump float;

	uniform samplerCube u_skybox;
	uniform mat4 u_viewDirectionProjectionInverse;

	varying vec4 v_position;
	void main() {
	vec4 t = u_viewDirectionProjectionInverse * v_position;
	gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
	}
`;

const meshVS = `
	attribute vec4 a_pos;
	attribute vec2 a_texCoord;
	attribute vec3 a_normal;
	
	uniform mat4 u_mvp;
	uniform mat4 u_mv;
	uniform mat3 u_mn;

	uniform vec3 u_lightDirection;
	
	varying vec2 v_texcoord;
	varying vec3 v_normal;
	varying vec4 v_viewSource;
	
	void main() {
		gl_Position = u_mvp * a_pos;
		v_viewSource = u_mv * a_pos;
		v_texcoord = a_texCoord;
		v_normal = normalize(u_mn * a_normal);
	}	
`;	

const meshFS = `
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

		vec3 lightSource = u_lightDirection;
		float diffuse = dot(lightSource, normal);
		
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