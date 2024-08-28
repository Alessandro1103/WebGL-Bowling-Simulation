// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
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

function SimTimeStep(dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution, flagcollision, boundingBoxes) {
    
    var forces = new Array(positions.length);
    for (var i = 0; i < forces.length; ++i)
        forces[i] = new Vec3(0, 0, 0);

    // Calcolo della forza totale su ciascuna particella

    // Gravità
    for (var i = 0; i < positions.length; i++) {
        forces[i] = forces[i].add(gravity.mul(particleMass));
    }
    
    // Molla
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

    // Gestione delle collisioni con il suolo
    for (var i = 0; i < positions.length; i++) {
        if (positions[i].y < 0) {
            positions[i].y = 0;
            velocities[i].y *= -restitution;
        }

        if (positions[i].y == 0) {
            velocities[i].x *= 0.90;
            velocities[i].z *= 0.90;
        }

    }

    // Gestione delle collisioni con altri oggetti
    if (flagcollision) {

        for (let b = 0; b < boundingBoxes.length; b++) {
            let boxB = boundingBoxes[b];
            for (let i = 0; i < positions.length; i++) {
                // Verifica se la particella è all'interno della bounding box di boxB
                if (positions[i].x >= boxB.min.x && positions[i].x <= boxB.max.x &&
                    positions[i].y >= boxB.min.y && positions[i].y <= boxB.max.y &&
                    positions[i].z >= boxB.min.z && positions[i].z <= boxB.max.z) {
                    
                    // Calcolo della quantità di moto iniziale
                    let initialMomentum = velocities[i].mul(particleMass);
                    
                    // Asse X
                    if (positions[i].x > boxB.max.x) {
                        positions[i].x = boxB.max.x + 0.001;
                    } else if (positions[i].x < boxB.min.x) {
                        positions[i].x = boxB.min.x - 0.001;
                    }
                    velocities[i].x *= -restitution;

                    // Asse Y
                    if (positions[i].y > boxB.max.y) {
                        positions[i].y = boxB.max.y + 0.001;
                    } else if (positions[i].y < boxB.min.y) {
                        positions[i].y = boxB.min.y - 0.001;
                    }
                    velocities[i].y *= -restitution;

                    // Asse Z
                    if (positions[i].z > boxB.max.z) {
                        positions[i].z = boxB.max.z + 0.001;
                    } else if (positions[i].z < boxB.min.z) {
                        positions[i].z = boxB.min.z - 0.001;
                    }
                    velocities[i].z *= -restitution;
                    
                    // Calcolo della quantità di moto finale
                    let finalMomentum = velocities[i].mul(particleMass);

                    // Aggiornamento delle forze in base all'impulso
                    let impulse = finalMomentum.sub(initialMomentum);

                    // Smorzamento sull'impulso
                    let dampingFactor = 0.85; // Un valore tra 0.7 e 0.9 può essere adatto
                    impulse = impulse.mul(dampingFactor);

                    forces[i] = forces[i].add(impulse.div(dt));
                }
            }
        }
    }
    
    // Aggiornamento di posizioni e velocità
    for (var i = 0; i < positions.length; i++) {
        let acc = forces[i].div(particleMass);
        velocities[i] = velocities[i].add(acc.mul(dt));
        positions[i] = positions[i].add(velocities[i].mul(dt));
    }
}




