var settings = require('./settings');
var THREE = require('three');

var _material;

exports.getMaterial = getMaterial;

function getMaterial() {
    if(!_material) {
        _material = new THREE.MeshStandardMaterial( {
            roughness: 0.86,
            metalness: 0.45,
            color: 0xaaaaaa,
            emissive: 0x000000
        });
    }
    return _material;
}
