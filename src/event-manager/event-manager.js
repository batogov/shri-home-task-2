ym.modules.define('shri2017.imageViewer.EventManager', [
], function (provide) {

    var EVENTS = {
        mousedown: 'start',
        mousemove: 'move',
        mouseup: 'end',

        touchstart: 'start',
        touchmove: 'move',
        touchend: 'end',
        touchcancel: 'end',

        wheel: 'wheel',

        pointerdown: 'start',
        pointermove: 'move',
        pointerup: 'end',
        pointercancel: 'end',
        pointerleave: 'end'
    };

    function EventManager(elem, callback) {
        this._elem = elem;
        this._callback = callback;
        this._pointers = {};

        this._setupListeners();
    }

    Object.assign(EventManager.prototype, {
        destroy: function () {
            this._teardownListeners();
        },

        _setupListeners: function () {
            // Если у клиента не поддерживаются Pointer Events, то вешаем touch и mouse события
            if (!window.PointerEvent) {
                this._mouseListener = this._mouseEventHandler.bind(this);
                this._touchListener = this._touchEventHandler.bind(this);

                this._addEventListeners('mousedown', this._elem, this._mouseListener);
                this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            }

            this._pointerListener = this._pointerEventHandler.bind(this);
            this._wheelListener = this._wheelEventHandler.bind(this);

            this._addEventListeners('pointerdown pointermove pointerup pointercancel pointerleave', this._elem, this._pointerListener);
            this._addEventListeners('wheel', this._elem, this._wheelListener);
        },

        _teardownListeners: function () {
            if (!window.PointerEvent) {
                this._removeEventListeners('mousedown', this._elem, this._mouseListener);
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            }

            this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            this._removeEventListeners('pointerdown pointermove pointerup pointercancel pointerleave', this._elem, this._pointerListener);
            this._removeEventListeners('wheel', this._elem, this._wheelListener);
        },

        _addEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.addEventListener(type, callback);
            }, this);
        },

        _removeEventListeners: function (types, elem, callback) {
            types.split(' ').forEach(function (type) {
                elem.removeEventListener(type, callback);
            }, this);
        },

        _mouseEventHandler: function (event) {
            console.log('Mouse');

            event.preventDefault();

            if (event.type === 'mousedown') {
                this._addEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            } else if (event.type === 'mouseup') {
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);
            }

            var elemOffset = this._calculateElementOffset(this._elem);

            this._callback({
                type: EVENTS[event.type],
                targetPoint: {
                    x: event.clientX - elemOffset.x,
                    y: event.clientY - elemOffset.y
                },
                distance: 1
            });
        },

        _wheelEventHandler: function (event) {
            console.log('Wheel');

            event.preventDefault();

            this._callback({
                type: EVENTS[event.type],
                deltaY: event.deltaY
            });
        },

        _touchEventHandler: function (event) {
            console.log('Touch');

            event.preventDefault();

            var touches = event.touches;

            if (touches.length === 0) {
                touches = event.changedTouches;
            }

            var targetPoint;
            var distance = 1;
            var elemOffset = this._calculateElementOffset(this._elem);

            if (touches.length === 1) {
                targetPoint = {
                    x: touches[0].clientX,
                    y: touches[0].clientY
                };
            } else {
                var firstTouch = touches[0];
                var secondTouch = touches[1];

                targetPoint = this._calculateTargetPoint(firstTouch.clientX, 
                    firstTouch.clientY,
                    secondTouch.clientX,
                    secondTouch.clientY
                );

                distance = this._calculateDistance(firstTouch.clientX, 
                    firstTouch.clientY,
                    secondTouch.clientX,
                    secondTouch.clientY
                );
            }

            targetPoint.x -= elemOffset.x;
            targetPoint.y -= elemOffset.y;

            this._callback({
                type: EVENTS[event.type],
                targetPoint: targetPoint,
                distance: distance
            });
        },

        _pointerEventHandler: function (event) {
            console.log('Pointer', EVENTS[event.type]);

            var targetPoint;
            var distance = 1;
            var elemOffset = this._calculateElementOffset(this._elem);

            if (event.type === 'pointerdown') {
                if (Object.keys(this._pointers).length === 2) {
                    this._pointers = {};
                }
            }

            this._pointers[event.pointerId] = {
                x: event.clientX,
                y: event.clientY
            }

            if (event.type === 'pointerup' || event.type === 'pointerleave' || event.type === 'pointercancel') {
                delete this._pointers[event.pointerId];
            }

            if (Object.keys(this._pointers).length === 2) {
                var firstTouch = this._pointers[Object.keys(this._pointers)[0]];
                var secondTouch = this._pointers[Object.keys(this._pointers)[1]];

                targetPoint = this._calculateTargetPoint(firstTouch.x, 
                    firstTouch.y,
                    secondTouch.x,
                    secondTouch.y
                );

                distance = this._calculateDistance(firstTouch.x, 
                    firstTouch.y,
                    secondTouch.x,
                    secondTouch.y
                );
            } else {
                var targetPoint = {
                    x: event.clientX - elemOffset.x,
                    y: event.clientY - elemOffset.y
                };
            }

            targetPoint.x -= elemOffset.x;
            targetPoint.y -= elemOffset.y;

            this._callback({
                type: EVENTS[event.type],
                targetPoint: targetPoint,
                distance: distance
            });

        },

        _calculateTargetPoint: function (firstTouchX, firstTouchY, secondTouchX, secondTouchY) {
            return {
                x: (secondTouchX + firstTouchX) / 2,
                y: (secondTouchY + firstTouchY) / 2
            };
        },

        _calculateDistance: function (firstTouchX, firstTouchY, secondTouchX, secondTouchY) {
            return Math.sqrt(
                Math.pow(secondTouchX - firstTouchX, 2) +
                Math.pow(secondTouchY - firstTouchY, 2)
            );
        },

        _calculateElementOffset: function (elem) {
            var bounds = elem.getBoundingClientRect();
            return {
                x: bounds.left,
                y: bounds.top
            };
        }
    });

    provide(EventManager);
});
