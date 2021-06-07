// 实现一个自定义事件
function EventEmitter() {
    // 必须使用new命令
    if (!(this instanceof EventEmitter)) return new EventEmitter();
    this.__events = {};
}
EventEmitter.installTo = function(obj) {
    if (typeof obj !== 'object') {
        throw new TypeError('obj must be an object');
    }
    // if (obj.__events !== undefined) {
    //     throw new Error('此对象已经存在 __events 属性了。');
    // }
    if (typeof Object.defineProperty === 'function') {
        Object.defineProperty(obj, '__events', {
            value: {},
            configurable: true,
            enumerable: false,
            writable: true
        });
        ['on', 'off', 'fire', 'one'].forEach(function(key) {
            Object.defineProperty(obj, key, {
                value: EventEmitter.prototype[key],
                configurable: true,
                enumerable: false,
                writable: true
            });
        });
    } else {
        obj.__events = {};
        obj.on = EventEmitter.prototype.on;
        obj.off = EventEmitter.prototype.off;
        obj.fire = EventEmitter.prototype.fire;
        obj.one = EventEmitter.prototype.one;
    }
    return obj;
};
$.extend(EventEmitter.prototype, {
    on: function(type, fn) {
        if ($.type(type) !== 'string') {
            console.error('The Event name must be a string');
            return this;
        }
        if ($.type(fn) !== 'function') {
            console.error('The Event handler must be a function');
            return this;
        }
        type = type.toLowerCase();
        if (!this.__events[type]) {
            this.__events[type] = [];
        }
        this.__events[type].push(fn);
        return this;
    },
    fire: function(type, data, context) {
        if ($.type(type) != 'string') {
            console.error('The Event name must be a string');
            return this;
        }
        type = type.toLowerCase();
        var eventArr = this.__events[type];
        if (!eventArr || !eventArr.length) return;
        for (var i = 0, l = eventArr.length; i < l; ++i) {
            eventArr[i].call(context || this, {
                type: type,
                target: this,
                data: data
            });
        }
        return this;
    },
    off: function(type, fn) {
        var eventArr = this.__events[type];
        if (!eventArr || !eventArr.length) return;

        if (!fn) {
            this.__events[type] = eventArr = [];
        } else {
            for (var i = 0; i < eventArr.length; ++i) {
                if (fn === eventArr[i]) {
                    eventArr.splice(i, 1);
                    --i;
                }
            }
        }
        return this;
    },
    one: function(type, fn) {
        var that = this;

        function nfn() {
            // 执行时 先取消绑定
            that.off(type, nfn);
            // 再执行函数
            fn.apply(this || that, arguments);
        }

        this.on(type, nfn);

        return this;
    },
    clear: function() {
        this.__events = {};
    }
});

const eventEmitter = new EventEmitter();
export default eventEmitter;
export { eventEmitter };

