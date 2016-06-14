#pragma glslify: map = require(./map)


vec3 calcNormal( in vec3 pos )
{
  vec3 eps = vec3(0.02,0.0,0.0);

  return normalize( vec3(
    map(pos+eps.xyy) - map(pos-eps.xyy),
    map(pos+eps.yxy) - map(pos-eps.yxy),
    map(pos+eps.yyx) - map(pos-eps.yyx) ) );
}

#pragma glslify: export(calcNormal)
