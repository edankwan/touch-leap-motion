var settings = require('./settings');
var THREE = require('three');

var shaderParse = require('../helpers/shaderParse');
var glslify = require('glslify');

var undef;

var mesh = exports.mesh = undef;
var pointLight = exports.pointLight = undef;
exports.init = init;
exports.update = update;

var _plane;

var _moveTime = 0;

function init() {

    mesh = exports.mesh = new THREE.Object3D();
    mesh.position.y = 150;

    var ambient = new THREE.AmbientLight( 0x333333 );
    mesh.add( ambient );

    pointLight = exports.pointLight = new THREE.PointLight( 0xcccccc, 1, 800 );
    pointLight.castShadow = true;
    pointLight.shadowCameraNear = 10;
    pointLight.shadowCameraFar = 800;
    pointLight.shadowCameraFov = 90;
    pointLight.shadowBias = settings.shadowDarkness;
    pointLight.shadowDarkness = 0.3;
    pointLight.shadowMapWidth = 2048;
    pointLight.shadowMapHeight = 1024;
    mesh.add( pointLight );


    var geometry = new THREE.PlaneGeometry( 100, 100 );
    var planeMaterial = new THREE.ShaderMaterial( {
        uniforms: {
        },
        vertexShader: shaderParse(glslify('../glsl/leap/light.vert')),
        fragmentShader: shaderParse(glslify('../glsl/leap/light.frag')),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false
    });

    _plane = new THREE.Mesh( geometry, planeMaterial );
    mesh.add( _plane );

}

function update(dt, camera) {
    _moveTime += dt * settings.lightSpeed;
    var angle = _moveTime * 0.0005 - 0.2;
    mesh.position.x = Math.cos(angle) * 200;
    mesh.position.z = Math.sin(angle) * 200;

    _plane.lookAt(camera.position);

}
