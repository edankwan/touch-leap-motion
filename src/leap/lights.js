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

    pointLight = exports.pointLight = new THREE.PointLight( 0x999999, 1, 800 );
    pointLight.castShadow = true;
    pointLight.shadow.camera.near = 10;
    pointLight.shadow.camera.far = 800;
    // pointLight.shadow.camera.fov = 90;
    pointLight.shadow.bias = 0.01;
    pointLight.shadow.mapWidth = 2048;
    pointLight.shadow.mapHeight = 1024;
    mesh.add( pointLight );


    var directionalLight = new THREE.DirectionalLight( 0xba8b8b, 0.5 );
    directionalLight.position.set( 1, 1, 1 );
    mesh.add( directionalLight );

    var directionalLight2 = new THREE.DirectionalLight( 0x8bbab4, 0.3 );
    directionalLight2.position.set( 1, 1, -1 );
    mesh.add( directionalLight2 );

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
    pointLight.add( _plane );

}

function update(dt, camera) {
    _moveTime += dt * settings.lightSpeed;
    var angle = _moveTime * 0.0005 - 0.2;
    pointLight.position.x = Math.cos(angle) * 200;
    pointLight.position.z = Math.sin(angle) * 200;

    _plane.lookAt(camera.position);

}
