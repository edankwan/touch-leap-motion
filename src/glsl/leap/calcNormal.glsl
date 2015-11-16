#pragma glslify: map = require(./map)

vec3 calcNormal( in vec3 p ) {

    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.01;
    return normalize( e.xyy * map( p + e.xyy ) +
        e.yyx * map( p + e.yyx ) +
        e.yxy * map( p + e.yxy ) +
        e.xxx * map( p + e.xxx ) );
}

#pragma glslify: export(calcNormal)
