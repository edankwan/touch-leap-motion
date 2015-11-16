float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}

float sdCappedCylinderLower( vec3 p, vec2 h ){
  vec2 d = abs(vec2(length(p.xz),p.y + h.y)) - h;
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdFingerBone( in vec3 p, in mat4 fingerBone) {

    vec3 scale = vec3(fingerBone[0][3], fingerBone[1][3], fingerBone[2][3]);

    fingerBone[0][3] = 0.0;
    fingerBone[1][3] = 0.0;
    fingerBone[2][3] = 0.0;

    p = (fingerBone * vec4(p, 1.0)).xyz;

    return min(
        sdSphere(p, scale.x),
        sdCappedCylinderLower(p, vec2(scale.x, scale.y / 2.0))
    );
}

#pragma glslify: export(sdFingerBone)
