float hash( float v ) { return fract( sin(v) * 12.419821); }

#pragma glslify: export(hash)
