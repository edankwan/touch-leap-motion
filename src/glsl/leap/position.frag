uniform vec2 resolution;

uniform sampler2D textureVelocity2;
uniform sampler2D textureVelocity;
uniform sampler2D texturePosition;
uniform mat4 data[16];

uniform float dropRadius;
uniform float fromY;
uniform float yDynamicRange;

const float INTERSECTION_PRECISION = 1.0;
const float FAR = 2000.0;
const float PI_2 = 6.2831853072;

#pragma glslify: map = require(./map)
#pragma glslify: calcNormal = require(./calcNormal)
#pragma glslify: hash = require(./hash)
#pragma glslify: random = require(glsl-random)

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 positionInfo = texture2D( texturePosition, uv );
    vec3 position = positionInfo.xyz;
    vec3 prevVelocity = texture2D( textureVelocity2, uv ).xyz;
    vec4 velocityInfo = texture2D( textureVelocity, uv );
    vec3 velocity = velocityInfo.xyz;

    float d = velocityInfo.w;

    positionInfo.w -= 0.01;

    if(positionInfo.w < 0.0) {

        positionInfo.w = 1.0 + random(uv + 2.0);
        float a = hash(uv.x) * PI_2;
        float r = pow(hash(uv.y), 0.75) * dropRadius;
        position = vec3( cos(a) * r, fromY + random(uv + 1.0) * yDynamicRange, sin(a) * r );

    } else {

        float velocityDistance = length(prevVelocity);
        if(d < velocityDistance) {

            if(d > INTERSECTION_PRECISION) {
                // raymarch
                vec3 rd = normalize(prevVelocity);
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

            if(d < 0.0) {
                position += normal * (-d + INTERSECTION_PRECISION);
            }

        }

        position += velocity;
    }

    gl_FragColor = vec4(position, positionInfo.w);

}
