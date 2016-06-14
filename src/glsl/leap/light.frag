varying vec2 vUv;

void main() {
    float d = max(1.0 - length(vUv - 0.5) * 2.0, 0.0);
    gl_FragColor = vec4(mix(vec3(0.73, 0.55, 0.55), vec3(1.0), d) * d, d );
}
