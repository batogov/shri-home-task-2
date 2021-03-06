ym.modules.define('shri2017.imageViewer.GestureController', [
    'shri2017.imageViewer.EventManager',
    'util.extend'
], function (provide, EventManager, extend) {

    var DBL_TAP_STEP = 0.25,
        ZOOM_DIVIDER_RATE = 500;

    var Controller = function (view) {
        this._view = view;

        this._eventManager = new EventManager(
            this._view.getElement(),
            this._eventHandler.bind(this)
        );

        this._lastEventTypes = '';

        // Флаги жестов
        this._isOneFingerZoom = false;
        this._isMultitouchZoom = false;
    };

    extend(Controller.prototype, {
        destroy: function () {
            this._eventManager.destroy();
        },

        _eventHandler: function (event) {
            // Каждые 500ms обнуляем строку последний событий
            if (this._lastEventTypes) {
                setTimeout(function () {
                    this._lastEventTypes = '';
                }.bind(this), 500);
            }

            // Заполняем строку последних событий
            this._lastEventTypes += ' ' + event.type;

            // Убираем случайные move события
            this._lastEventTypes = this._lastEventTypes.replace(/move /g, '');

            if (this._lastEventTypes.match(/start end start end/)) {
                // Ловим двойной клик
                this._processDbltap(event);
                this._lastEventTypes = '';
            } else if (event.distance > 1 && event.distance !== this._initEvent.distance) {
                // Ловим Multitouch Zoom
                this._isMultitouchZoom = true;
                this._lastEventTypes = '';
            } else if (this._lastEventTypes.match(/start end start move/)) {
                // Ловим One Finger Zoom
                this._isOneFingerZoom = true;
                this._lastEventTypes = '';
            }

            // При событии move выбираем жест для выполнения
            if (event.type === 'move') { 
                if (this._isMultitouchZoom) {
                    this._processMultitouchZoom(event);
                } else if (this._isOneFingerZoom) {
                    this._processOneFingerZoom(event);
                } else {
                    this._processDrag(event);
                }
            } else {
                this._initState = this._view.getState();
                this._initEvent = event;
            }

            // Сбрасываем флаги жестов при событии end
            if (event.type === 'end') {
                this._isOneFingerZoom = false;
                this._isMultitouchZoom = false;
            }

            // Обрабатываем колёсико мыши
            if (event.type === 'wheel') {
                this._processWheel(event);
            }
        },

        _processOneFingerZoom: function (event) {
            // Блокируем One Finger Zoom, если у клиента не touch
            if (!event.isTouch) {
                return;
            } 

            var state = this._view.getState();
            this._scale(
                this._initEvent.targetPoint,
                this._initState.scale + (event.targetPoint.y - this._initEvent.targetPoint.y) / ZOOM_DIVIDER_RATE
            );
        },

        _processWheel: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale - event.deltaY / ZOOM_DIVIDER_RATE
            );
        },

        _processDrag: function (event) {
            this._view.setState({
                positionX: this._initState.positionX + (event.targetPoint.x - this._initEvent.targetPoint.x),
                positionY: this._initState.positionY + (event.targetPoint.y - this._initEvent.targetPoint.y)
            });
        },

        _processMultitouchZoom: function (event) {
            this._scale(
                event.targetPoint,
                this._initState.scale * (event.distance / this._initEvent.distance)
            );
        },

        _processDbltap: function (event) {
            var state = this._view.getState();
            this._scale(
                event.targetPoint,
                state.scale + DBL_TAP_STEP
            );
        },

        _scale: function (targetPoint, newScale) {
            var imageSize = this._view.getImageSize();
            var state = this._view.getState();

            // Позиция прикосновения на изображении на текущем уровне масштаба
            var originX = targetPoint.x - state.positionX;
            var originY = targetPoint.y - state.positionY;

            // Размер изображения на текущем уровне масштаба
            var currentImageWidth = imageSize.width * state.scale;
            var currentImageHeight = imageSize.height * state.scale;

            // Относительное положение прикосновения на изображении
            var mx = originX / currentImageWidth;
            var my = originY / currentImageHeight;

            // Размер изображения с учетом нового уровня масштаба
            var newImageWidth = imageSize.width * newScale;
            var newImageHeight = imageSize.height * newScale;

            // Рассчитываем новую позицию с учетом уровня масштаба
            // и относительного положения прикосновения
            state.positionX += originX - (newImageWidth * mx);
            state.positionY += originY - (newImageHeight * my);

            // Устанавливаем текущее положение мышки как "стержневое"
            state.pivotPointX = targetPoint.x;
            state.pivotPointY = targetPoint.y;

            // Устанавливаем масштаб и угол наклона
            state.scale = newScale;
            this._view.setState(state);
        }
    });

    provide(Controller);
});
