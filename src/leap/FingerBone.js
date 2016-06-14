var settings = require('./settings');
var MeshMotionMaterial = require('./postprocessing/motionBlur/MeshMotionMaterial');
var THREE = require('three');
var getMaterial = require('./skin').getMaterial;

function FingerBone(fingerIndex, fromNodeIndex, toNodeIndex) {

    THREE.Object3D.call(this);

    this.fingerIndex = fingerIndex;
    this.fromNodeIndex = fromNodeIndex;
    this.toNodeIndex = toNodeIndex;

    this.outputMatrix = new THREE.Matrix4();
    this.tmpPosition = new THREE.Vector3();
    this.tmpQuaternion = new THREE.Quaternion();
    this.tmpScale = new THREE.Vector3();
    this.nodeAdjustmentQuaternion = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI / 2);

    this.bone = new THREE.Mesh(_getBoneGeometry(), getMaterial());
    this.bone.motionMaterial = new MeshMotionMaterial();
    this.bone.castShadow = true;
    this.bone.receiveShadow = true;
    this.add(this.bone);

    this.node = new THREE.Mesh(_getNodeGeometry(), getMaterial());
    this.node.motionMaterial = new MeshMotionMaterial();
    this.node.castShadow = true;
    this.node.receiveShadow = true;
    this.add(this.node);

}

module.exports = FingerBone;
var _super = THREE.Object3D.prototype;
var _p = FingerBone.prototype = Object.create(_super);
_p.constructor = FingerBone;

_p.updateOutputMatrix = updateOutputMatrix;
_p.leapUpdate = leapUpdate;

var _scaleVector = new THREE.Vector3(1, 1, 1);
var _boneGeometry;
var _nodeGeometry;


function _getBoneGeometry () {
    if(!_boneGeometry) {
        _boneGeometry = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
        _boneGeometry.translate ( 0, -0.5, 0 );
    }
    return _boneGeometry;
}

function _getNodeGeometry() {
    if(!_nodeGeometry) {
        _nodeGeometry = new THREE.SphereGeometry(1, 10, 12);
    }
    return _nodeGeometry;
}

function updateOutputMatrix() {
    var outputMatrix = this.outputMatrix;
    var position = this.tmpPosition;
    var quaternion = this.tmpQuaternion;
    var scale = this.tmpScale;

    outputMatrix.copy(this.bone.matrixWorld);
    outputMatrix.decompose(position, quaternion, scale);
    outputMatrix.compose(position, quaternion, _scaleVector);
    outputMatrix.getInverse(outputMatrix);

    outputMatrix.elements[3] = scale.x;
    outputMatrix.elements[7] = scale.y;
    outputMatrix.elements[11] = scale.z;

    return Array.prototype.slice.call(outputMatrix.elements);
}

function leapUpdate(fingers) {
    var finger = fingers[this.fingerIndex];
    var fingerPosition = finger.positions;
    var from = fingerPosition[this.fromNodeIndex];
    var to = fingerPosition[this.toNodeIndex];
    var scale = finger.width / 2;
    this.node.position.set(from[0], from[1], from[2]);
    this.bone.position.set(to[0], to[1], to[2]);
    this.bone.lookAt(this.node.position);
    this.node.scale.set(scale, scale, scale);
    var length = this.bone.position.distanceTo(this.node.position);
    this.node.position.copy(this.bone.position);
    this.bone.scale.set(scale, length, scale);
    this.bone.quaternion.multiply(this.nodeAdjustmentQuaternion);
}

