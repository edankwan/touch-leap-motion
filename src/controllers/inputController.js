var MinSignal = require('min-signal');
var contains = require('mout/array/contains');
var forEach = require('mout/array/forEach');

var undef;

var _win = window;
var _doc = document;
var _documentElement = _doc.documentElement;

var _isDownSkippedPreventDefault = false;

exports.hasTouch = 'ontouchstart' in _win;
//exports.supportPointerEvents: false;
exports.inputTarget = document.body;

exports.onDowned = new MinSignal();
exports.onMoved = new MinSignal();
exports.onUped = new MinSignal();

exports.onSwipeH = new MinSignal();
exports.onSwipeV = new MinSignal();

exports.isDown = false;
exports.isScrollH = false;
exports.isScrollV = false;

exports.isFirstTouch = undef;

exports.x = 0;
exports.y = 0;
exports.distanceX = 0;
exports.distanceY = 0;
exports.deltaX = 0;
exports.deltaY = 0;
exports.deltaTime = 0;

exports.downBubbleHistory = [];
exports.currentBubbleHistory = [];
exports.prevBubbleHistory = [];

exports.lastUpTime = 0;
exports.isOnSwipePane = false;
exports.elems = [];

exports.disablePreventDefault = false;

exports.clickTime = 500;
exports.clickDistance = 40;

var _hasEventListener = 'addEventListener' in _win;
var __docElement = _doc.documentElement;

var _injectPrefix = '__ek';

var _isDown = false;
var _downTime = 0;
var _downX = 0;
var _downY = 0;
var _currentTime = 0;
var _currentX = -1;
var _currentY = -1;

// var _pointerEventsNoneList = [];

var elems = exports.elems;

var TYPE_LIST = ['over', 'out', 'tap', 'click', 'down', 'move', 'up', 'wheel'];

function add(elem, type, func) {
    if (elem.length) {
        for(var i = 0, len = elem.length; i < len; i++) {
            add(elem[i], type, func);
        }
        return;
    }
    if (elem) {
        elem[_injectPrefix + type] = func;
        elem[_injectPrefix + 'hasInput'] = true;
        elems.push(elem);
    }
}

function remove(elem, type) {
    var i, len;
    if (elem.length) {
        for( i = 0, len = elem.length; i < len; i++) {
            remove(elem[i], type);
        }
        return;
    }

    if (elem) {
        if (type) {
            elem[_injectPrefix + type] = undef;
        } else {
            forEach(TYPE_LIST, function (ev) {
                elem[_injectPrefix + ev] = undef;
            });
            elem[_injectPrefix + 'hasInput'] = false;
        }
        var hasEvent = false;
        for( i = 0, len = TYPE_LIST.length; i < len; i++ ) {
            if(elem[_injectPrefix + TYPE_LIST[i]]) {
                hasEvent = true;
                break;
            }
        }
        if (!hasEvent) {
            for ( i = 0, len = elems.length; i < len; i++) {
                if (elems[i] == elem) {
                    elems.splice(i, 1);
                    break;
                }
            }
        }
    }
}


function init() {
    _doc.ondragstart = function () {
        return false;
    };
    var inputTarget = exports.inputTarget;
    if (exports.hasTouch) {
        inputTarget.addEventListener('touchstart', _bindEventDown);
        inputTarget.addEventListener('touchmove', _bindEventMove);
        _documentElement.addEventListener('touchend', _bindEventUp);
        inputTarget.addEventListener('mousedown', _bindEventDown);
        inputTarget.addEventListener('mousemove', _bindEventMove);
        _documentElement.addEventListener('mouseup', _bindEventUp);
        // inputTarget.addEventListener('gesturechange', _preventDefault);
    } else if (_hasEventListener) {
        inputTarget.addEventListener('mousedown', _bindEventDown);
        inputTarget.addEventListener('mousemove', _bindEventMove);
        _documentElement.addEventListener('mouseup', _bindEventUp);
        inputTarget.addEventListener('mousewheel', _boundEventWheel);
        inputTarget.addEventListener('DOMMouseScroll', _boundEventWheel);
        //inputTarget.addEventListener("contextmenu", _preventDefault);
    } else {
        inputTarget.attachEvent('onmousedown', _bindEventDown);
        inputTarget.attachEvent('onmousemove', _bindEventMove);
        _documentElement.attachEvent('onmouseup', _bindEventUp);
        inputTarget.attachEvent('onmousewheel', _boundEventWheel);
        //inputTarget.attachEvent("contextmenu", _preventDefault);
    }

    exports.onDowned.add(_onDown, exports, 1024);
    exports.onMoved.add(_onMove, exports, 1024);
    exports.onUped.add(_onUp, exports, 1024);
    exports.onUped.add(_afterOnUp, exports, -1024);
}


function _boundEventWheel(ev) {
    ev = ev || _win.event;
    var delta = ev.wheelDelta;
    if(delta) {
        delta = delta / 120;
    } else {
        delta = -ev.detail / 3;
    }

    var target;
    var bubbleHistory = exports.currentBubbleHistory;
    var i = bubbleHistory.length;
    while(i--) {
        target = bubbleHistory[i];
        if(target[_injectPrefix + 'wheel']) {
            ev.currentTarget = target;
            target[_injectPrefix + 'wheel'].call(target, delta, ev);
        }
    }
}


function _preventDefault(ev) {
    if (exports.disablePreventDefault) {
        return;
    }
    if (ev.preventDefault) {
        ev.preventDefault();
    } else {
        ev.returnValue = false;
    }
}

function _bindEventDown(ev) {
    return _mixInputEvent.call(this, ev, function (ev) {
        var targetTagName = ev.target.nodeName.toLowerCase();
        if (_doc.activeElement && !contains(['input', 'select', 'label', 'option', 'textarea'], targetTagName) && ev.target.contentEditable !== 'true') {
            var activeElement = _doc.activeElement;
            if (!contains(['body'], activeElement.nodeName.toLowerCase())) {
                _doc.activeElement.blur();
            }
        }
        exports.onDowned.dispatch(ev);
    });
}

function _bindEventMove(ev) {
    return _mixInputEvent.call(this, ev, function (ev) {
        exports.onMoved.dispatch(ev);
    });
}

function _bindEventUp(ev) {
    return _mixInputEvent.call(this, ev, function (ev) {
        exports.onUped.dispatch(ev);
    });
}

function _preventDefaultFunc(ev) {
    return function () {
        _preventDefault.call(this, ev);
    };
}

function _isSkipPreventDefaultElement(target, isMove) {
    if (target.__skipPreventDefault) {
        return true;
    }
    var nodeName = target.nodeName.toLowerCase();
    if (contains(['source', 'object', 'iframe'], nodeName)) {
        return true;
    }
    if (isMove) {
        return false;
    }
    return target.contentEditable === 'true' || contains(['input', 'select', 'label', 'textarea', 'option'], nodeName);
}

// function _detectPointEventsNone(target, x, y) {
//     var realTarget = target;
//     while (target) {
//         if (target.__isPointerEventsNone) {
//             _pointerEventsNoneList.push(target);
//             target.style.visibility = 'hidden';
//             return _detectPointEventsNone(_doc.elementFromPoint(x, y), x, y);
//         }
//         target = target.parentNode;
//     }

//     return realTarget;
// }


// function _cleanUpPointEventsNoneList() {
//     for (var i = 0, len = _pointerEventsNoneList.length; i < len; i++) {
//         _pointerEventsNoneList[i].style.display;
//         _pointerEventsNoneList[i].style.visibility = 'visible'; // TODO: deal with the exceptions
//     }
//     _pointerEventsNoneList = [];
// }

function _mixInputEvent(ev, func) {
    ev = ev || _win.event;
    var fakedEvent = {
        originalEvent: ev,
        button: ev.button,
        preventDefault: _preventDefaultFunc(ev)
    };
    var i, elem, x, y, touchEvent, bubbleHistory, target;
    var type = ev.type;
    var time = fakedEvent.currentTime = (new Date()).getTime();
    var isDown = type.indexOf('start') > -1 || type.indexOf('down') > -1;
    // var isUp = type.indexOf('end') > -1 || type.indexOf('up') > -1;
    var isMove = type.indexOf('move') > -1;
    var isTouch = fakedEvent.isTouch = type.indexOf('touch') > -1;
    var isSkipPreventDefault = false;
    if (exports.isFirstTouch === undef) {
        exports.isFirstTouch = isTouch;
    }
    if (isTouch) {
        touchEvent = ev.touches.length ? ev.touches[0] : ev.changedTouches[0];
        fakedEvent.x = x = touchEvent.pageX;
        fakedEvent.y = y = touchEvent.pageY;
        fakedEvent.target = target = touchEvent.target;

        // if (!exports.supportPointerEvents) {
        //  fakedEvent.target = target = _detectPointEventsNone(target, x, y);
        //  _cleanUpPointEventsNoneList();
        // }
        exports.prevBubbleHistory = exports.currentBubbleHistory;
        bubbleHistory = exports.currentBubbleHistory = fakedEvent.bubbleHistory = [];
        while (target) {
            bubbleHistory.unshift(target);
            if (!isSkipPreventDefault && _isSkipPreventDefaultElement(target, isMove)) {
                isSkipPreventDefault = fakedEvent.isSkipPreventDefault = true;
            }
            target = target.parentNode;
        }
    } else {
        fakedEvent.x = x = _hasEventListener ? ev.pageX : ev.clientX + __docElement.scrollLeft;
        fakedEvent.y = y = _hasEventListener ? ev.pageY : ev.clientY + __docElement.scrollTop;
        fakedEvent.target = target = ev.target ? ev.target : ev.srcElement;
        // if (!exports.supportPointerEvents) {
        //  fakedEvent.target = target = _detectPointEventsNone(target, x, y);
        //  _cleanUpPointEventsNoneList();
        // }
        exports.prevBubbleHistory = exports.currentBubbleHistory;
        bubbleHistory = exports.currentBubbleHistory = fakedEvent.bubbleHistory = [];
        while (target) {
            bubbleHistory.unshift(target);
            if (!isSkipPreventDefault && _isSkipPreventDefaultElement(target, isMove)) {
                isSkipPreventDefault = fakedEvent.isSkipPreventDefault = true;
            }
            target = target.parentNode;
        }
    }
    exports.x = x;
    exports.y = y;

    if (isDown) {
        _isDown = true;
        _downTime = _currentTime = time;
        _downX = _currentX = x;
        _downY = _currentY = y;
        exports.downBubbleHistory = bubbleHistory;

        i = bubbleHistory.length;
        while (i--) {
            elem = bubbleHistory[i];
            if (isTouch && elem[_injectPrefix + 'over']) {
                fakedEvent.currentTarget = elem;
                elem[_injectPrefix + 'over'].call(elem, fakedEvent);
            }
            if (elem[_injectPrefix + 'down']) {
                fakedEvent.currentTarget = elem;
                elem[_injectPrefix + 'down'].call(elem, fakedEvent);
            }
        }
        _isDownSkippedPreventDefault = isSkipPreventDefault;
    }

    // TODO: add the skip preventDefault logic
    if(!_isDownSkippedPreventDefault){//  || isMove) {
        fakedEvent.preventDefault();
    }

    if (_isDown) {
        fakedEvent.distanceTime = time - _downTime;
        fakedEvent.distanceX = x - _downX;
        fakedEvent.distanceY = y - _downY;
        fakedEvent.distance = Math.sqrt((x - _downX) * (x - _downX) + (y - _downY) * (y - _downY));
    }

    fakedEvent.deltaTime = time - _currentTime;
    fakedEvent.deltaX = x - (_currentX < 0 ? x : _currentX);
    fakedEvent.deltaY = y - (_currentY < 0 ? y : _currentY);

    _currentTime = time;
    _currentX = x;
    _currentY = y;

    if (type.indexOf('end') > -1 || type.indexOf('up') > -1) {
        _isDown = false;
    }

    func(fakedEvent);
}

function _checkRollover(ev) {
    var prevBubbleHistory = exports.prevBubbleHistory;
    var i = ev.bubbleHistory.length;
    var target;
    while (i--) {
        target = ev.bubbleHistory[i];
        if (target[_injectPrefix + 'over'] || target[_injectPrefix + 'out']) {
            if(!contains(prevBubbleHistory, target)) {
                if(!target[_injectPrefix + 'isHover']) {
                    target[_injectPrefix + 'isHover'] = true;
                    if(target[_injectPrefix + 'over']) {
                        ev.currentTarget = target;
                        target[_injectPrefix + 'over'].call(target, ev);
                    }
                }
            }
        }
    }
}

function _checkRollout(ev) {
    var bubbleHistory = ev.bubbleHistory;
    var i = exports.prevBubbleHistory.length;
    var target;
    while (i--) {
        target = exports.prevBubbleHistory[i];
        if (target[_injectPrefix + 'isHover']) {
            if(!contains(bubbleHistory, target)) {
                target[_injectPrefix + 'isHover'] = false;
                if(target[_injectPrefix + 'out']) {
                    ev.currentTarget = target;
                    target[_injectPrefix + 'out'].call(target, ev);
                }
            }
        }
    }
}

function _onDown(ev) {
    exports.isDown = true;
    _checkRollout(ev);
    _checkRollover(ev);
    var i = ev.bubbleHistory.length;
    var target;
    while (i--) {
        target = ev.bubbleHistory[i];
        if (target[_injectPrefix + 'tap']) {
            ev.currentTarget = target;
            target[_injectPrefix + 'tap'].call(target, ev);
        }
    }
}

function _onMove(ev) {
    _checkRollout(ev);
    _checkRollover(ev);
    exports.deltaX = ev.deltaX;
    exports.deltaY = ev.deltaY;
    exports.deltaTime = ev.deltaTime;
    var hasDistance = ev.distanceX !== undef;
    if(!hasDistance) {
        ev.distanceX = exports.distanceX;
        ev.distanceY = exports.distanceY;
    }
    exports.distanceX = ev.distanceX;
    exports.distanceY = ev.distanceY;
    exports.distanceTime = ev.distanceTime;
    if (!exports.isScrollH && !exports.isScrollV && exports.isDown) {
        if (ev.distance > 0) {
            if (Math.abs(ev.distanceX) > Math.abs(ev.distanceY)) {
                exports.isScrollH = true;
                exports.onSwipeH.dispatch(ev);
            } else {
                exports.isScrollV = true;
                exports.onSwipeV.dispatch(ev);
            }
        }
    }

    var i = ev.bubbleHistory.length;
    var target;
    while (i--) {
        target = ev.bubbleHistory[i];
        if (target[_injectPrefix + 'move']) {
            ev.currentTarget = target;
            target[_injectPrefix + 'move'].call(target, ev);
        }
    }
    if(!hasDistance) {
        exports.distanceX = ev.distanceX;
        exports.distanceY = ev.distanceY;
    }
}

function _onUp(ev) {
    exports.isDown = false;

    exports.distanceTime = ev.distanceTime;

    var i = ev.bubbleHistory.length;
    var downBubbleHistory = exports.downBubbleHistory;
    var target, j;
    var isClick = ev.isClick = ev.distanceTime !== null && ev.distanceTime < exports.clickTime && ev.distance < exports.clickDistance;
    ev.isDoubleClick = ev.currentTime - exports.lastUpTime < 400;
    // if(!ev.isSkipPreventDefault) {
    //     ev.preventDefault();
    // }

    while (i--) {
        target = ev.bubbleHistory[i];
        if (ev.isTouch && target[_injectPrefix + 'out']) {
            ev.currentTarget = target;
            target[_injectPrefix + 'out'].call(target, ev);
        }
        if (target[_injectPrefix + 'up']) {
            ev.currentTarget = target;
            target[_injectPrefix + 'up'].call(target, ev);
        }
        if (isClick && target[_injectPrefix + 'click']) {

            j = downBubbleHistory.length;
            while(j--) {
                if(downBubbleHistory[j] === target) {
                    ev.currentTarget = target;
                    target[_injectPrefix + 'click'].call(target, ev);
                    break;
                }
            }
        }
    }
}

function _afterOnUp(ev) {
    exports.isScrollH = false;
    exports.isScrollV = false;
    exports.lastUpTime = ev.currentTime;
}

exports.init = init;
exports.add = add;
exports.remove = remove;
