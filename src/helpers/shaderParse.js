var THREE = require('three');

var threeChunkRegExp = /\/\/\s?chunk\(\s?(\w+)\s?\);/g;
var glslifyBugFixRegExp = /(_\d+_\d+)(_\d+_\d+)+/g;
var glslifyGlobalRegExp = /GLOBAL_VAR_([^\.\)\;\,\s]+)(_\d+)/g;

function _threeChunkParse(shader) {
    return shader.replace(threeChunkRegExp, _replaceThreeChunkFunc);
}

function _glslifyBugFixParse(shader) {
    return shader.replace(glslifyBugFixRegExp, _returnFirst);
}

function _glslifyGlobalParse(shader) {
    return shader.replace(glslifyGlobalRegExp, _returnFirst);
}

function _replaceThreeChunkFunc(a, b) {
    return THREE.ShaderChunk[b] + '\n';
}

function _returnFirst(a, b) {
    return b;
}

function parse(shader) {
    shader = _threeChunkParse(shader);
    shader = _glslifyBugFixParse(shader);
    return _glslifyGlobalParse(shader);
}

module.exports = parse;
