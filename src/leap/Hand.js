var settings = require('./settings');
var THREE = require('three');

var MeshMotionMaterial = require('./postprocessing/motionBlur/MeshMotionMaterial');
var FingerBone = require('./FingerBone');
var getMaterial = require('./skin').getMaterial;

function Hand() {

    THREE.Object3D.call(this);

    this.fingerBones = [];
    this.palmOutputMatrix = new THREE.Matrix4();
    this.tmpPosition = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();
    this.tmpScale = new THREE.Vector3();

    var quaternion = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI / 2);
    quaternion.multiply((new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI / 6));
    this.palmOutputAdjustmentMatrix = (new THREE.Matrix4()).makeRotationFromQuaternion(quaternion);

    this.palmMeshAdjustmentQuaternion = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI / 6);

    this.palmVelocity = new THREE.Vector3();

    this._initFingers();
    this._initPalm();
}

module.exports = Hand;
var _super = THREE.Object3D.prototype;
var _p = Hand.prototype = Object.create(_super);
_p.constructor = Hand;

_p._initFingers = _initFingers;
_p._initPalm = _initPalm;
_p.leapUpdate = leapUpdate;
_p.updateOutputMatrix = updateOutputMatrix;

var _scaleVector = new THREE.Vector3(1,1,1);

function _initFingers() {

    var fingerBone;
    for(var i = 0; i < 5; i++) {
        for(var j = 1; j < 4; j++) {
            fingerBone = new FingerBone(i, j, j+1);
            this.fingerBones.push(fingerBone);
            this.add(fingerBone);
        }
    }
}

function _initPalm() {
    var geometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.palm = new THREE.Mesh(geometry, getMaterial());
    this.palm.motionMaterial = new MeshMotionMaterial();
    this.palm.castShadow = true;
    this.palm.receiveShadow = true;
    this.add(this.palm);
}


function leapUpdate(hand) {

    var fingers = hand.fingers;
    var fingerBones = this.fingerBones;
    for(var i = 0, len = fingerBones.length; i < len; i++) {
        fingerBones[i].leapUpdate(fingers);
    }

    // update palm
    this.palm.position.fromArray(hand.palmPosition);
    this.palm.rotation.set( hand.pitch(), -hand.yaw(), hand.roll());
    this.palm.translateZ(20);
    this.palm.translateX(-5);
    this.palm.quaternion.multiply(this.palmMeshAdjustmentQuaternion);

    var p0 = (new THREE.Vector3()).fromArray(hand.pinky.positions[1]);
    var p1 = (new THREE.Vector3()).fromArray(hand.thumb.positions[1]);
    var radius = p0.distanceTo(p1) * 0.45;
    this.palm.scale.set(radius, hand.thumb.width * 1.2, radius);

    this.palmVelocity.fromArray(hand.palmVelocity);

    this.updateMatrixWorld();

    this.updateOutputMatrix();
}

function updateOutputMatrix() {

    var list = [];

    var palmOutputMatrix = this.palmOutputMatrix;
    var position = this.tmpPosition;
    var quaternion = this.tmpQuaternion;
    var scale = this.tmpScale;

    palmOutputMatrix.copy(this.palm.matrixWorld);
    palmOutputMatrix.multiply(this.palmOutputAdjustmentMatrix);

    palmOutputMatrix.decompose(position, quaternion, scale);
    palmOutputMatrix.compose(position, quaternion, _scaleVector);
    palmOutputMatrix.getInverse(palmOutputMatrix);


    // match the sdf primitive sin60
    palmOutputMatrix.elements[3] = scale.x * 0.866025;
    palmOutputMatrix.elements[7] = scale.y * 0.866025;
    palmOutputMatrix.elements[11] = scale.z;

    list.push(Array.prototype.slice.call(palmOutputMatrix.elements));

    var fingerBones = this.fingerBones;
    for(var i = 0, len = fingerBones.length; i < len; i++) {
        list.push(fingerBones[i].updateOutputMatrix());
        fingerBones[i].updateOutputMatrix();
    }

    return list;
}
