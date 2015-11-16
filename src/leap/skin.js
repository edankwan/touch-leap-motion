var settings = require('./settings');
var THREE = require('three');

var _material;

exports.getMaterial = getMaterial;

function getMaterial() {
    if(!_material) {
        _material = new THREE.MeshPhongMaterial({
            color: 0xffffff
        });
    }
    return _material;
}
