var dat = require('dat-gui');
var Stats = require('stats.js');
var css = require('dom-css');
var raf = require('raf');

var THREE = require('three');
var leap = require('./libs/leapjs/index');
var settings = require('./leap/settings');
var Hand = require('./leap/Hand');
var ground = require('./leap/ground');
var lights = require('./leap/lights');
var particles = require('./leap/particles');
var defaultHandData = require('./leap/defaultHandData');
var gripHandData = require('./leap/gripHandData');
var encode = require('mout/queryString/encode');

var OrbitControls = require('./controls/OrbitControls');

var fboHelper = require('./leap/fboHelper');
var postprocessing = require('./leap/postprocessing/postprocessing');
var vignette = require('./leap/postprocessing/vignette/vignette');
var motionBlur = require('./leap/postprocessing/motionBlur/motionBlur');
var fxaa = require('./leap/postprocessing/fxaa/fxaa');
var vignette = require('./leap/postprocessing/vignette/vignette');
var bloom = require('./leap/postprocessing/bloom/bloom');

var mobile = require('./fallback/mobile');

var undef;
var _gui;
var _stats;

var _width = 0;
var _height = 0;

var _control;
var _camera;
var _scene;
var _renderer;

var _hand;

var _time = 0;
var _initAnimation = 0;
var _initZoomAnimation = 0;
var _gripRatio = 0;

var _logo;
var _footerItems;

var _ray = new THREE.Ray();
var _isLog = false;
var _isDown = false;
var _hasLeapUpdated = false;
var _hasLeap = undef;
var _prevHandData = undef;

function init() {

    if(settings.useStats) {
        _stats = new Stats();
        css(_stats.domElement, {
            position : 'absolute',
            left : '0px',
            top : '0px',
            zIndex : 2048
        });

        document.body.appendChild( _stats.domElement );
    }

    _renderer = new THREE.WebGLRenderer({
        premultipliedAlpha : false,
    });
    fboHelper.init(_renderer);

    _renderer.setClearColor(0x0f1010);
    // _renderer.shadowMap.type = THREE.BasicShadowMap;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.shadowMap.enabled = true;
    document.body.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2( 0x0f1010, 0.00075 );

    _camera = new THREE.PerspectiveCamera( 45, 1, 1, 3000);
    _camera.position.set(0, 3000, 5000);

    _control = new OrbitControls( _camera, _renderer.domElement );
    _control.noPan = true;
    _control.minDistance = 250;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2;
    _control.target.y = 100;
    _control.update();

    settings.mouse = new THREE.Vector2(0,0);
    settings.mouse3d = _ray.origin;

    postprocessing.init(_renderer, _scene, _camera);

    lights.init();
    _scene.add(lights.mesh);

    _hand = new Hand();
    _scene.add(_hand);

    ground.init();
    _scene.add(ground.mesh);

    particles.init(_renderer, _hand);
    _scene.add(particles.mesh);






    _gui = new dat.GUI();
    var simulatorGui = _gui.addFolder('Simulator');
    simulatorGui.add(settings.query, 'amount', settings.amountList).onChange(function(){
        if (confirm('It will restart the demo')) {
            window.location.href = window.location.href.split('#')[0] + encode(settings.query).replace('?', '#');
            window.location.reload();
        }
    });
    simulatorGui.add(settings, 'gravity', -5, 20);
    simulatorGui.add(settings, 'particlesFromY', 0, 500).name('from Y');
    simulatorGui.add(settings, 'particlesYDynamicRange', -500, 500).name('y dynamic range');
    simulatorGui.add(settings, 'particlesDropRadius', 0, 150).name('drop radius');
    simulatorGui.add(settings, 'handBounceRatio', 0, 1).name('hand bounce');
    simulatorGui.add(settings, 'handForce', 0, 0.1).name('hand force');


    var postprocessingGui = _gui.addFolder('Post-Processing');
    postprocessingGui.add(settings, 'fxaa').listen();

    motionBlur.maxDistance = 120;
    motionBlur.motionMultiplier = 4;
    var motionBlurControl = postprocessingGui.add(settings, 'motionBlur');
    var motionMaxDistance = postprocessingGui.add(motionBlur, 'maxDistance', 1, 300).name('motion distance').listen();
    var motionMultiplier = postprocessingGui.add(motionBlur, 'motionMultiplier', 0.1, 10).name('motion multiplier').listen();
    var motionQuality = postprocessingGui.add({lineTexture: 'one third'}, 'lineTexture', ['full', 'half', 'one third', 'quarter']).name('motion quality').onChange(function(val){
        if(val === 'full') {
            motionBlur.linesRenderTargetScale = 1;
        } else if(val === 'half') {
            motionBlur.linesRenderTargetScale = 0.5;
        } else if(val === 'one third') {
            motionBlur.linesRenderTargetScale = 1 / 3;
        } else {
            motionBlur.linesRenderTargetScale = 0.25;
        }
        motionBlur.resize();
    });
    var fadeStrengthControl = postprocessingGui.add(motionBlur, 'fadeStrength', 1, 5).name('motion fade');
    var opacityControl = postprocessingGui.add(motionBlur, 'opacity', 0, 1).name('motion opacity');
    var jitterControl = postprocessingGui.add(motionBlur, 'jitter', 0, 1).name('motion jitter');
    var controlList = [motionMaxDistance, motionMultiplier, motionQuality, fadeStrengthControl, opacityControl, jitterControl];
    motionBlurControl.onChange(enableGuiControl.bind(this, controlList));
    enableGuiControl(controlList, settings.motionBlur);

    var bloomControl = postprocessingGui.add(settings, 'bloom');
    var bloomRadiusControl = postprocessingGui.add(bloom, 'blurRadius', 0, 3).name('bloom radius');
    var bloomAmountControl = postprocessingGui.add(bloom, 'amount', 0, 3).name('bloom amount');
    controlList = [bloomRadiusControl, bloomAmountControl];
    bloomControl.onChange(enableGuiControl.bind(this, controlList));
    enableGuiControl(controlList, settings.bloom);

    postprocessingGui.add(settings, 'vignette');

    // postprocessingGui.open();


    function enableGuiControl(controls, flag) {
        controls = controls.length ? controls : [controls];
        var control;
        for(var i = 0, len = controls.length; i < len; i++) {
            control = controls[i];
            control.__li.style.pointerEvents = flag ? 'auto' : 'none';
            control.domElement.parentNode.style.opacity = flag ? 1 : 0.1;
        }
    }
    var preventDefault = function(evt){evt.preventDefault();this.blur();};
    Array.prototype.forEach.call(_gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem){
        elem.onkeyup = elem.onkeydown = preventDefault;
        elem.style.color = '#000';
    });

    _logo = document.querySelector('.logo');
    _footerItems = document.querySelectorAll('.footer span');

    _gui.domElement.addEventListener('mousedown', _stopPropagation);
    _gui.domElement.addEventListener('touchstart', _stopPropagation);

    window.addEventListener('click', _onClick);
    window.addEventListener('mousedown', _onDown);
    window.addEventListener('touchstart', _bindTouch(_onDown));
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('touchmove', _bindTouch(_onMove));
    window.addEventListener('mouseup', _onUp);
    window.addEventListener('touchend', _bindTouch(_onUp));
    window.addEventListener('resize', _onResize);

    var defaultHand = _createInpterpolatedHandData(defaultHandData, gripHandData, {});
    defaultHand.pitch = function(){return this._pitch;};
    defaultHand.yaw = function(){return this._yaw;};
    defaultHand.roll = function(){return this._roll;};
    _onLeapUpdate({hands: [defaultHand]}, true);
    leap.loop(_onLeapUpdate);

    _time = Date.now();
    _onResize();
    _loop();

}

function _createInpterpolatedHandData(data0, data1, target) {
    var val0, val1;
    for(var prop in data0) {
        if(_hasOwn(data0, prop)) {
            val0 = data0[prop];
            val1 = data1[prop];
            if(typeof val0 === 'object') {
                target[prop] = _createInpterpolatedHandData(val0, val1, val0.length ? [] : {});
            } else if(!isNaN(val0)) {
                Object.defineProperty(target, prop, { get: _getLerpHandData.bind(null, data0, data1, prop) });
            }
        }
    }
    return target;
}

function _getLerpHandData(data0, data1, prop) {
    var a = data0[prop];
    var b = data1[prop];
    return a + (b - a) * _gripRatio;
}

function _hasOwn(obj, prop){
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

function _onClick() {
    _isLog = true;
}

function _stopPropagation(evt) {
    evt.stopPropagation();
}

function _bindTouch(func) {
    return function (evt) {
        func(evt.changedTouches[0]);
    };
}

function _onDown() {
    _isDown = true;
}

function _onMove(evt) {
    settings.mouse.x = (evt.pageX / _width) * 2 - 1;
    settings.mouse.y = -(evt.pageY / _height) * 2 + 1;
}

function _onUp() {
    _isDown = false;
}

function _onLeapUpdate(frame, isDefaultData) {

    if(!isDefaultData && !_hasLeap) {
        _hasLeap = true;
    }
    if (frame.hands && frame.hands.length) {

        _prevHandData = frame.hands[0];

        _hasLeapUpdated = true;

        if(_isLog) {
            _isLog = false;
            // var hand = frame.hands[0];

            // Record default hand data

            // var handData = {};
            // var fingers = handData.fingers = [];
            // var data;
            // for(var i = 0; i < 5; i++) {
            //     data = fingers[i] = {};
            //     data.positions = hand.fingers[i].positions;
            //     data.width = hand.fingers[i].width;
            // }
            // handData.palmPosition = hand.palmPosition;
            // handData.palmVelocity = hand.palmVelocity;
            // handData._pitch = hand.pitch();
            // handData._yaw = hand.yaw();
            // handData._roll = hand.roll();
            // handData.pinky = {positions : [0, hand.pinky.positions[1]]};
            // handData.thumb = {positions : [0, hand.thumb.positions[1]], width : hand.thumb.width};
            // handData.palmPosition = hand.palmPosition;
            // console.log(JSON.stringify(handData, true, '    '));


            // Record static data for shadertoy test.

            // var count = 0;
            // var res = _hand.updateOutputMatrix();
            // var output = JSON.stringify(res, true, '    ');
            // output = output.replace(/,\s\s\s\s\s\s\s\s/gm, ',');
            // output = output.replace(/\[\s\s\s\s\s\s\s\s/gm, function(){
            //     return 'data[' + (count++) +  '] = mat4(';
            // });
            // output = output.replace(/,\s1\s\s\s\s\s\]/gm, ', 1.0);');
            // output = output.replace(/,\s0,/gm, ', 0.0,');
            // output = output.replace(/;,/gm, ';');
            // output = output.replace(/\s\s\s\s\s\],/gm, ');');
            // output = output.replace(/\s\s\s\s\s\]/gm, ');');
            // console.log(output);
        }
    }
}





function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;

    postprocessing.resize(_width, _height);
}

function _loop() {
    var newTime = Date.now();
    raf(_loop);
    if(settings.useStats) _stats.begin();
    _render(newTime - _time, newTime);
    if(settings.useStats) _stats.end();
    _time = newTime;
}

function _lerp(min, max, ratio) {
    return min + (max - min) * ratio;
}

function _clamp(value, min, max) {
    return value > max ? max : value < min ? min : value;
}

function _range(min, max, val) {
    return _clamp((val - min) / (max - min), 0, 1);
}

function _render(dt, newTime) {

    _initAnimation = Math.min(_initAnimation + dt * 0.0002, 1);
    _initZoomAnimation = Math.min(_initZoomAnimation + dt * 0.0001, 1);

    var easedInitAnimation = Math.pow(_initAnimation, 0.3);
    var easedInitZoomAnimation = Math.pow(_initZoomAnimation, 0.3);

    _control.maxDistance = _initZoomAnimation === 1 ? 1200 : _lerp(1400, 500, easedInitZoomAnimation);
    _control.update();

    // update mouse3d
    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition( _camera.matrixWorld );
    _ray.direction.set( settings.mouse.x, settings.mouse.y, 0.5 ).unproject( _camera ).sub( _ray.origin ).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add( _ray.direction.multiplyScalar(distance));

    if(_hasLeap === undef) {
        _gripRatio += ((_isDown ? 1 : 0) - _gripRatio) * 0.01 * dt;
        defaultHandData.palmVelocity[0] = gripHandData.palmVelocity[0] = (_ray.origin.x - _hand.position.x) * 20;
        defaultHandData.palmVelocity[1] = gripHandData.palmVelocity[1] = (_ray.origin.y - _hand.position.y) * 20;
        defaultHandData.palmVelocity[2] = gripHandData.palmVelocity[2] = (_ray.origin.z - _hand.position.z) * 20;
        _hand.position.copy(_ray.origin);

    } else {
        if(!_hasLeapUpdated) {
            defaultHandData.palmVelocity[0] = defaultHandData.palmVelocity[1] = defaultHandData.palmVelocity[2] = 0;
        }
        _hand.position.x -= _hand.position.x * 0.05;
        _hand.position.y -= _hand.position.y * 0.05;
        _hand.position.z -= _hand.position.z * 0.05;
    }

    _hand.leapUpdate(_prevHandData);

    particles.update(dt);
    lights.update(dt, _camera);

    var ratio = Math.min((1 - Math.abs(_initZoomAnimation - 0.5) * 2) * 1.2, 1);
    var blur = (1 - ratio) * 10;
    _logo.style.opacity = ratio;
    _logo.style.display = ratio ? 'block' : 'none';
    _logo.style.webkitFilter = 'blur(' + blur + 'px)';

    ratio = (0.8 + Math.pow(_initAnimation, 1.5) * 0.3);
    if(_width < 580) ratio *= 0.5;
    _logo.style.transform = 'scale3d(' + ratio + ',' + ratio + ',1)';

    for(var i = 0, len = _footerItems.length; i < len; i++) {
        ratio = _range(0.5 + i * 0.01, 0.6 + i * 0.01, _initAnimation);
        _footerItems[i].style.transform = 'translate3d(0,' + ((1 - Math.pow(ratio, 3)) * 50) + 'px,0)';
    }


    fxaa.enabled = !!settings.fxaa;
    motionBlur.enabled = !!settings.motionBlur;
    vignette.enabled = !!settings.vignette;
    bloom.enabled = !!settings.bloom;

    postprocessing.render(dt, newTime);

    _hasLeapUpdated = false;

}



mobile.pass(function() {
    var img = new Image();
    img.src = 'images/logo.png';
    if(img.width) {
        init();
    } else {
        img.onload = init;
    }
});
