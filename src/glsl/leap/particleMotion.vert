attribute vec2 fboUV;

uniform sampler2D texturePosition;
uniform sampler2D texturePrevPosition;

uniform mat4 u_prevModelViewMatrix;
varying vec2 v_motion;


#ifdef USE_BILLBOARD

    attribute vec3 positionFlip;
    uniform float flipRatio;

#endif

void main() {

    vec4 positionInfo = texture2D( texturePosition, fboUV );
    vec4 prevPositionInfo = texture2D( texturePrevPosition, fboUV );

    vec4 pos = modelViewMatrix * vec4( positionInfo.xyz, 1.0 );
    vec4 prevPos = u_prevModelViewMatrix * vec4( prevPositionInfo.xyz, 1.0 );

    #ifdef USE_BILLBOARD

        vec4 flipOffset = vec4(mix(position, positionFlip, flipRatio) * 0.5, 1.0);
        pos = projectionMatrix * (pos + flipOffset);
        prevPos = projectionMatrix * (prevPos + flipOffset);

    #else

        gl_PointSize = ( 300.0 / length( pos.xyz ) );
        pos.y += gl_PointSize* 0.5;
        pos = projectionMatrix * pos;

        prevPos.y += ( 300.0 / length( prevPos.xyz ) )* 0.5;
        prevPos = projectionMatrix * prevPos;

    #endif

    gl_Position = pos;
    v_motion = (pos.xy / pos.w - prevPos.xy / prevPos.w) * 0.5 * step(positionInfo.w, prevPositionInfo.w);

}
