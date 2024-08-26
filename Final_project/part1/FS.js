var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Plane {
    vec3 normal;
    float d;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Plane lanePlane;
uniform Material laneMaterial;
uniform Light  lights[NUM_LIGHTS];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay(inout HitInfo hit, Ray ray);

// Shades the given point and returns the computed color.
vec3 Shade(Material mtl, vec3 position, vec3 normal, vec3 view)
{
	vec3 color = vec3(0, 0, 0);

	for (int i = 0; i < NUM_LIGHTS; ++i) {
		vec3 lightDirection = normalize(lights[i].position - position);
		vec3 halfVector = normalize(lightDirection + view);
		float diffAng = max(0.0, dot(normal, lightDirection));
		float specAng = max(0.0, dot(normal, halfVector));

		// Check for shadows 
		Ray shadowRay;
		shadowRay.pos = position + normal * 0.00001;
		shadowRay.dir = normalize(lights[i].position - shadowRay.pos);
		HitInfo shadowHit;
		bool inShadow = IntersectRay(shadowHit, shadowRay) && shadowHit.t < length(lights[i].position - shadowRay.pos);

		// If not shadowed, perform shading using the Blinn model
		if (!inShadow) {
			vec3 diffuse = mtl.k_d * lights[i].intensity * diffAng;
			vec3 specular = mtl.k_s * lights[i].intensity * pow(specAng, mtl.n);

			color += diffuse + specular;
		}
	}
	return color;
}

// Intersects the given ray with the plane (lane) and updates the given HitInfo.
bool IntersectRay(inout HitInfo hit, Ray ray)
{
    hit.t = 1e30;
    bool foundHit = false;

    // Intersezione con il pavimento (piano)
    float denom = dot(lanePlane.normal, ray.dir);
    if (abs(denom) > 0.00001) { // Evita divisione per zero
        float t = -(dot(ray.pos, lanePlane.normal) + lanePlane.d) / denom;
        if (t > 0.00001 && t < hit.t) {
            hit.t = t;
            hit.position = ray.pos + t * ray.dir;
            hit.normal = lanePlane.normal;
            hit.mtl = laneMaterial;  // Qui assegni il materiale del pavimento
            foundHit = true;
        }
    }

    return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a plane or returns the environment color.
vec4 RayTracer(Ray ray)
{
	HitInfo hit;
	if (IntersectRay(hit, ray)) {
		vec3 view = normalize(-ray.dir);
		vec3 clr = Shade(hit.mtl, hit.position, hit.normal, view);
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
			if (bounce >= bounceLimit) break;
			if (hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0) break;
			
			Ray r;  // this is the reflection ray
			HitInfo h;  // reflection hit info
			
			// Initialize the reflection ray
			r.pos = hit.position + hit.normal * 0.00001;
			r.dir = reflect(ray.dir, hit.normal);

			if (IntersectRay(h, r)) {
				// Hit found, so shade the hit point
				clr += k_s * Shade(h.mtl, h.position, h.normal, normalize(-r.dir));
				ray = r;
				hit = h;
				k_s *= hit.mtl.k_s;
			} else {
				// The reflection ray did not intersect with anything, so use the environment color
				clr += k_s * textureCube(envMap, r.dir.xzy).rgb;
				break;  // no more reflections
			}
		}
		return vec4(clr, 1);  // return the accumulated color, including the reflections
	} else {
		return vec4(textureCube(envMap, ray.dir.xzy).rgb, 1);  // return the environment color
	}
}
`;

// Initialize the lane plane and material
var lanePlane = {
	normal: [0, 1, 0], // Normal pointing up
	d: -1.0            // The plane is at y = -1
};

var laneMaterial = {
    k_d: [0.0, 0.0, 0.0],  // Colore diffusione nero
    k_s: [0.5, 0.5, 0.5],  // Speculare con leggera riflessione grigia
    n: 50.0                // Esponente speculare
};
