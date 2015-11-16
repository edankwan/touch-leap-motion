uniform vec2 resolution;

uniform sampler2D textureVelocity;
uniform sampler2D texturePosition;
uniform mat4 data[16];
uniform vec3 palmVelocity;

uniform float handBounceRatio;
uniform float handForce;
uniform float gravity;

const float INTERSECTION_PRECISION = 1.0;
const float FAR = 2000.0;

#pragma glslify: map = require(./map)
#pragma glslify: calcNormal = require(./calcNormal)
#pragma glslify: hash = require(./hash)
#pragma glslify: random = require(glsl-random)

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 positionInfo = texture2D( texturePosition, uv );
    vec3 position = positionInfo.xyz;
    vec3 velocity = texture2D( textureVelocity, uv ).xyz;

    float d = map(position);

    if(positionInfo.w < 0.005) {

        d = FAR;
        velocity = vec3( 0.0, random(uv) * 1.0, 0.0 );

    } else {

        if(position.y < 0.0) {
            float groundBounceRatio =  random(position.xz);
            velocity.y *= -0.5 * groundBounceRatio;
            velocity.xz *= 0.5 * groundBounceRatio;

            // add some fake physics on the floor to make it looks better when
            // the hand is not blocking the particles
            float strength = length(velocity) * pow(positionInfo.w, 3.0);
            velocity.x += (random(uv + 0.1) - 0.5) *strength;
            velocity.z += (random(uv + 0.4) - 0.5) *strength;
        } else {
            velocity.y -= (0.03 - 0.005 * random(uv + 5.0)) * gravity;
        }

        float velocityDistance = length(velocity);
        d = map(position);
        if(d < velocityDistance) {

            if(d > INTERSECTION_PRECISION) {
                // raymarch
                vec3 rd = normalize(velocity);
                position = position + rd * d;

                float dd = 0.0;
                for( int i = 0; i < 10; i++ ) {
                    dd = map( position);
                    if(dd < INTERSECTION_PRECISION || d > FAR) break;
                    d += dd;
                    position += rd * dd;
                }

            }
            vec3 normal = calcNormal(position);

            velocity = reflect(velocity, normal) * handBounceRatio;
            vec3 palmDirection = normalize(palmVelocity);
            velocity += palmVelocity * handForce * max(dot(palmDirection, normal), 0.0);

        }
    }

    gl_FragColor = vec4(velocity, d );

}
