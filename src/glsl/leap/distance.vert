attribute vec2 fboUV;

uniform sampler2D texturePosition;



#ifdef USE_BILLBOARD

    attribute vec3 positionFlip;
    uniform float flipRatio;

#endif

varying vec4 vWorldPosition;

void main() {

    vec3 pos = texture2D( texturePosition, fboUV ).xyz;

    vec4 worldPosition = modelMatrix * vec4( pos, 1.0 );
    vec4 mvPosition = viewMatrix * worldPosition;

    #ifdef USE_BILLBOARD

        vec4 flipOffset = vec4(mix(position, positionFlip, flipRatio) * 0.5, 1.0);
        gl_Position = projectionMatrix * (mvPosition + flipOffset);

    #else

        gl_PointSize = ( 300.0 / length( mvPosition.xyz ) );
        mvPosition.y += gl_PointSize* 0.5;
        gl_Position = projectionMatrix * mvPosition;

    #endif

    vWorldPosition = worldPosition;

}
