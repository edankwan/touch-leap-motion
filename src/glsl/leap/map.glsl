#pragma glslify: sdFingerBone = require(./sdFingerBone)

float sdHexPrism( vec3 p, vec2 h ) {
    vec3 q = abs(p);
    return max(q.z-h.y,max((q.x*0.866025+q.y*0.5),q.y)-h.x);
}

float map( in vec3 p ) {
    float d = GLOBAL_VAR_FAR;

    mat4 palmData = GLOBAL_VAR_data[0];
    vec3 scale = vec3(palmData[0][3], palmData[1][3], palmData[2][3]);

    palmData[0][3] = 0.0;
    palmData[1][3] = 0.0;
    palmData[2][3] = 0.0;

    d = min(d, sdHexPrism((palmData * vec4(p, 1.0)).xyz, vec2(scale.x, scale.z / 2.0)));

    for( int i = 1; i < 16; i++ ) {
        d = min(d, sdFingerBone(p, GLOBAL_VAR_data[i]));
    }

    return d;
}

#pragma glslify: export(map)
