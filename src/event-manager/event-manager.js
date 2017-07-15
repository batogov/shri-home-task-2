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
        pointercancel: 'end'
    };

    function EventManager(elem, callback) {
        this._elem = elem;
        this._callback = callback;

        this._isDebug = true;
        this._pointers = {};

        this._setupListeners();
    }

    Object.assign(EventManager.prototype, {
        destroy: function () {
            this._teardownListeners();
        },

        _setupListeners: function () {
            // Если у клиента не поддерживаются Pointer Events, 
            // то вешаем touch и mouse события. Иначе – только Pointer Events
            if (!window.PointerEvent) {
                this._mouseListener = this._mouseEventHandler.bind(this);
                this._addEventListeners('mousedown', this._elem, this._mouseListener);

                this._touchListener = this._touchEventHandler.bind(this);
                this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            } else {
                this._pointerListener = this._pointerEventHandler.bind(this);
                this._addEventListeners('pointerdown', this._elem, this._pointerListener);
            
                // Блокируем default поведение у touch событий
                this._addEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._preventTouch);
            }

            // Вешаем обработчик на колёсико мыши
            this._wheelListener = this._wheelEventHandler.bind(this);
            this._addEventListeners('wheel', this._elem, this._wheelListener);
        },

        _teardownListeners: function () {
            if (!window.PointerEvent) {
                this._removeEventListeners('mousedown', this._elem, this._mouseListener);
                this._removeEventListeners('mousemove mouseup', document.documentElement, this._mouseListener);

                this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._touchListener);
            } else {
                this._removeEventListeners('pointerdown', this._elem, this._pointerListener);
                this._removeEventListeners('pointermove pointerup pointercancel', this._elem, this._pointerListener);
                this._removeEventListeners('wheel', this._elem, this._wheelListener);
                this._removeEventListeners('touchstart touchmove touchend touchcancel', this._elem, this._preventTouch);
            }
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

        _preventTouch: function (event) {
            event.preventDefault();
        },

        _mouseEventHandler: function (event) {
            if (this._isDebug) {
                console.log('Mouse', EVENTS[event.type]);
            }

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
            if (this._isDebug) {
                console.log('Wheel');
            }

            event.preventDefault();

            var elemOffset = this._calculateElementOffset(this._elem);

            this._callback({
                type: EVENTS[event.type],
                deltaY: event.deltaY,
                targetPoint: {
                    x: event.clientX - elemOffset.x,
                    y: event.clientY - elemOffset.y
                },
            });
        },

        _touchEventHandler: function (event) {
            if (this._isDebug) {
                console.log('Touch', EVENTS[event.type]);
            }

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
            event.preventDefault();

            if (!EVENTS[event.type]) {
                return;
            }

            if (this._isDebug) {
                console.log('Pointer', EVENTS[event.type]);
            }

            if (event.type === 'pointerdown') {
                this._pointers[event.pointerId] = event;
                this._addEventListeners('pointermove pointerup', document.documentElement, this._pointerListener);
            } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
                delete this._pointers[event.pointerId];
                if (Object.keys(this._pointers).length === 0) {
                    this._removeEventListeners('pointermove pointerup', document.documentElement, this._pointerListener);
                }
            } else if (event.type === 'pointermove') {
                this._pointers[event.pointerId] = event;
            }

            var targetPoint;
            var distance = 1;
            var elemOffset = this._calculateElementOffset(this._elem);

            if (Object.keys(this._pointers).length === 1) {
                targetPoint = {
                    x: this._pointers[Object.keys(this._pointers)[0]].clientX,
                    y: this._pointers[Object.keys(this._pointers)[0]].clientY
                }
            } else if (Object.keys(this._pointers).length > 1) {
                var firstTouch = this._pointers[Object.keys(this._pointers)[0]];
                var secondTouch = this._pointers[Object.keys(this._pointers)[1]];

                targetPoint = this._calculateTargetPoint(
                    firstTouch.clientX, 
                    firstTouch.clientY,
                    secondTouch.clientX,
                    secondTouch.clientY
                );

                distance = this._calculateDistance(
                    firstTouch.clientX, 
                    firstTouch.clientY,
                    secondTouch.clientX,
                    secondTouch.clientY
                );
            } else {
                targetPoint = {
                    x: event.clientX,
                    y: event.clientY
                }
            }

            targetPoint.x -= elemOffset.x;
            targetPoint.y -= elemOffset.y;

            this._callback({
                type: EVENTS[event.type],
                targetPoint: targetPoint,
                pointerType: event.pointerType,
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
