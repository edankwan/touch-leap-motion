var settings = require('./settings');
var THREE = require('three');

var undef;

exports.mesh = undef;
exports.init = init;

function init() {
    var geometry = new THREE.PlaneGeometry( 4000, 4000, 10, 10 );
    var planeMaterial = new THREE.MeshPhongMaterial( { color: 0x999999 } );
    var ground = exports.mesh = new THREE.Mesh( geometry, planeMaterial );

    ground.rotation.x = -1.57;
    ground.castShadow = false;
    ground.receiveShadow = true;

}
