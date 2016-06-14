var settings = require('./settings');
var THREE = require('three');

var glslify = require('glslify');
var shaderParse = require('../helpers/shaderParse');

var undef;

var _copyShader;
var _velocityShader;
var _positionShader;
var _velocityRenderTarget;
var _velocityRenderTarget2;
var _positionRenderTarget;
var _positionRenderTarget2;

var _renderer;
var _fboMesh;
var _fboScene;
var _fboCamera;
var _data;

var AMOUNT = exports.AMOUNT = settings.simulatorTextureWidth * settings.simulatorTextureHeight;

exports.init = init;
exports.update = update;
exports.positionRenderTarget = undef;
exports.prevPositionRenderTarget = undef;

function init(renderer, hand) {

    _renderer = renderer;

    var gl = _renderer.getContext();
    if ( !gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) ) {
        alert( 'No support for vertex shader textures!' );
        return;
    }
    if ( !gl.getExtension( 'OES_texture_float' )) {
        alert( 'No OES_texture_float support for float textures!' );
        return;
    }

    _data = [hand.palmOutputMatrix];
    for(var i = 0, len = hand.fingerBones.length; i < len; i++) {
        _data.push(hand.fingerBones[i].outputMatrix);
    }


    _fboScene = new THREE.Scene();
    _fboCamera = new THREE.Camera();
    _fboCamera.position.z = 1;

    _copyShader = new THREE.ShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( settings.simulatorTextureWidth, settings.simulatorTextureHeight ) },
            texture: { type: 't', value: null }
        },
        vertexShader: shaderParse(glslify('../glsl/leap/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/leap/fboThrough.frag'))
    });

    _velocityShader = new THREE.ShaderMaterial({
        uniforms: {
            texturePosition: { type: 't', value: null },
            textureVelocity: { type: 't', value: null },
            resolution: { type: 'v2', value: new THREE.Vector2( settings.simulatorTextureWidth, settings.simulatorTextureHeight ) },
            data: { type: 'm4v', value: _data },
            handBounceRatio: { type: 'f', value: settings.handBounceRatio },
            handForce: { type: 'f', value: settings.handForce },
            gravity: { type: 'f', value: settings.gravity },
            palmVelocity: { type: 'v3', value: hand.palmVelocity }
        },
        defines: {
            HAND_AMOUNT: settings.hands,
            MATRIX_AMOUNT: settings.hands * 16
        },
        vertexShader: shaderParse(glslify('../glsl/leap/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/leap/velocity.frag')),
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    _positionShader = new THREE.ShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( settings.simulatorTextureWidth, settings.simulatorTextureHeight ) },
            texturePosition: { type: 't', value: null },
            textureVelocity: { type: 't', value: null },
            textureVelocity2: { type: 't', value: null },
            dropRadius: { type: 'f', value: settings.particlesDropRadius },
            fromY: { type: 'f', value: settings.particlesFromY },
            yDynamicRange: { type: 'f', value: settings.particlesYDynamicRange },
            data: { type: 'm4v', value: _data }
        },
        defines: {
            HAND_AMOUNT: settings.hands,
            MATRIX_AMOUNT: settings.hands * 16
        },
        vertexShader: shaderParse(glslify('../glsl/leap/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/leap/position.frag')),
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    _fboMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), _copyShader );
    _fboScene.add( _fboMesh );

    _velocityRenderTarget = new THREE.WebGLRenderTarget( settings.simulatorTextureWidth, settings.simulatorTextureHeight, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false
    });
    _velocityRenderTarget2 = _velocityRenderTarget.clone();
    _copyTexture(_createVelocityTexture(), _velocityRenderTarget);
    _copyTexture(_velocityRenderTarget, _velocityRenderTarget2);

    _positionRenderTarget = new THREE.WebGLRenderTarget(settings.simulatorTextureWidth, settings.simulatorTextureHeight, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false
    });
    _positionRenderTarget2 = _positionRenderTarget.clone();

    _copyTexture(_createPositionTexture(), _positionRenderTarget);
    _copyTexture(_positionRenderTarget, _positionRenderTarget2);

}

function _updateVelocity(dt) {

    // swap
    var tmp = _velocityRenderTarget;
    _velocityRenderTarget = _velocityRenderTarget2;
    _velocityRenderTarget2 = tmp;

    _fboMesh.material = _velocityShader;
    _velocityShader.uniforms.textureVelocity.value = _velocityRenderTarget2;
    _velocityShader.uniforms.texturePosition.value = _positionRenderTarget;
    _renderer.render( _fboScene, _fboCamera, _velocityRenderTarget );
}

function _updatePosition(dt) {

    // swap
    var tmp = _positionRenderTarget;
    _positionRenderTarget = _positionRenderTarget2;
    _positionRenderTarget2 = tmp;

    _fboMesh.material = _positionShader;
    _positionShader.uniforms.texturePosition.value = _positionRenderTarget2;
    _positionShader.uniforms.textureVelocity.value = _velocityRenderTarget;
    _positionShader.uniforms.textureVelocity2.value = _velocityRenderTarget2;
    _renderer.render( _fboScene, _fboCamera, _positionRenderTarget );
}

function _copyTexture(input, output) {
    _fboMesh.material = _copyShader;
    _copyShader.uniforms.texture.value = input;
    _renderer.render( _fboScene, _fboCamera, output );
}

function _createVelocityTexture() {

    var a = new Float32Array( AMOUNT * 4 );
    for ( var i = 0, len = a.length; i < len; i += 4 ) {
        a[ i + 0 ] = 0;
        a[ i + 1 ] = -Math.random() * 10;
        a[ i + 2 ] = 0;
    }
    var texture = new THREE.DataTexture( a, settings.simulatorTextureWidth, settings.simulatorTextureHeight, THREE.RGBAFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.flipY = false;
    return texture;
}


function _createPositionTexture() {
    var a = new Float32Array( AMOUNT * 4 );
    var baseRadius = settings.particlesDropRadius;
    var fromY = settings.particlesFromY;
    var yDynamicRange = settings.particlesYDynamicRange;
    var radius, angle;
    for ( var i = 0, len = a.length; i < len; i += 4 ) {
        angle = Math.random() * Math.PI;
        radius = Math.pow(Math.random(), 0.75) * baseRadius;
        a[ i + 0 ] = Math.cos(angle) * radius;
        a[ i + 1 ] = fromY + Math.random() * yDynamicRange;
        a[ i + 2 ] = Math.sin(angle) * radius;
        a[ i + 3 ] = 0.5 + Math.random();
    }
    var texture = new THREE.DataTexture( a, settings.simulatorTextureWidth, settings.simulatorTextureHeight, THREE.RGBAFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
}

function update(dt) {

    _positionShader.uniforms.dropRadius.value = settings.particlesDropRadius;
    _positionShader.uniforms.fromY.value = settings.particlesFromY;
    _positionShader.uniforms.yDynamicRange.value = settings.particlesYDynamicRange;

    _velocityShader.uniforms.handBounceRatio.value = settings.handBounceRatio;
    _velocityShader.uniforms.handForce.value = settings.handForce;
    _velocityShader.uniforms.gravity.value = settings.gravity;

    _updateVelocity(dt);

    _updatePosition(dt);

    exports.positionRenderTarget = _positionRenderTarget;
    exports.prevPositionRenderTarget = _positionRenderTarget2;

}


