import validator from 'option-validator';
import Emitter from './emitter';
import Events from './events';
import Template from './template';
import Drawer from './drawer';
import Decoder from './decoder';
import Loader from './loader';
import Controller from './controller';
import { clamp, errorHandle } from './utils';

let id = 0;
const instances = [];
export default class WFPlayer extends Emitter {
    static get instances() {
        return instances;
    }

    static get version() {
        return process.env.APP_VER;
    }

    static get env() {
        return process.env.NODE_ENV;
    }

    static get default() {
        return {
            container: '#waveform',
            mediaElement: null,
            useWorker: true,
            wave: true,
            waveColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgb(28, 32, 34)',
            paddingColor: 'rgba(255, 255, 255, 0.05)',
            cursor: true,
            cursorColor: '#ff0000',
            progress: true,
            progressColor: 'rgba(255, 255, 255, 0.5)',
            grid: true,
            gridColor: 'rgba(255, 255, 255, 0.05)',
            ruler: true,
            rulerColor: 'rgba(255, 255, 255, 0.5)',
            rulerAtTop: true,
            scrollable: false,
            refreshDelay: 50,
            channel: 0,
            duration: 10,
            padding: 5,
            waveScale: 0.8,
            pixelRatio: Math.ceil(window.devicePixelRatio),
        };
    }

    static get scheme() {
        return {
            container: 'htmlelement|htmldivelement',
            mediaElement: 'null|htmlvideoelement|htmlaudioelement',
            useWorker: 'boolean',
            wave: 'boolean',
            waveColor: 'string',
            backgroundColor: 'string',
            paddingColor: 'string',
            cursor: 'boolean',
            cursorColor: 'string',
            progress: 'boolean',
            progressColor: 'string',
            grid: 'boolean',
            gridColor: 'string',
            ruler: 'boolean',
            rulerColor: 'string',
            rulerAtTop: 'boolean',
            scrollable: 'boolean',
            refreshDelay: 'number',
            channel: 'number',
            duration: 'number',
            padding: 'number',
            waveScale: 'number',
            pixelRatio: 'number',
        };
    }

    constructor(options = {}) {
        super();

        this._currentTime = 0;
        this.isDestroy = false;
        this.options = {};
        this.setOptions(options);

        this.events = new Events(this);
        this.template = new Template(this);
        this.decoder = new Decoder(this);
        this.drawer = new Drawer(this);
        this.controller = new Controller(this);
        this.loader = new Loader(this);

        this.update();

        id += 1;
        this.id = id;
        instances.push(this);
    }

    get currentTime() {
        return this.options.mediaElement ? this.options.mediaElement.currentTime : this._currentTime;
    }

    get duration() {
        return this.options.mediaElement ? this.options.mediaElement.duration : Infinity;
    }

    get playing() {
        const { mediaElement } = this.options;
        if (mediaElement) {
            return !!(
                mediaElement.currentTime > 0 &&
                !mediaElement.paused &&
                !mediaElement.ended &&
                mediaElement.readyState > 2
            );
        }
        return false;
    }

    get canvas() {
        return this.template.canvas;
    }

    get config() {
        return this.drawer.config;
    }

    setOptions(options = {}) {
        errorHandle(validator.kindOf(options) === 'object', 'setOptions expects to receive object as a parameter.');

        if (typeof options.container === 'string') {
            options.container = document.querySelector(options.container);
        }

        if (typeof options.mediaElement === 'string') {
            options.mediaElement = document.querySelector(options.mediaElement);
        }

        this.options = validator(
            {
                ...WFPlayer.default,
                ...this.options,
                ...options,
            },
            WFPlayer.scheme,
        );

        this.update();
        return this;
    }

    load(target) {
        this.emit('load', target);

        // Audiobuffer
        if (target && typeof target.getChannelData === 'function') {
            this.decoder.decodeSuccess(target);
            this.controller.init();
            return this;
        }

        // Uint8Array
        if (target && target.buffer) {
            this.decoder.decodeAudioData(target);
            this.controller.init();
            return this;
        }

        // HTMLVideoElement or HTMLAudioElement
        if (target instanceof HTMLVideoElement || target instanceof HTMLAudioElement) {
            this.options.mediaElement = target;
            target = target.currentSrc || target.src;
        }

        errorHandle(
            typeof target === 'string' && target.trim(),
            `The load target is not a string. If you are loading a mediaElement, make sure the mediaElement.src is not empty.`,
        );

        // String Url
        this.loader.load(target);
        this.controller.init();
        return this;
    }

    getCurrentTimeFromEvent(event) {
        const { canvas } = this.template;
        const { padding, beginTime, gridGap, pixelRatio } = this.drawer.config;
        const left = event.pageX - canvas.getBoundingClientRect().left;
        const paddingWidth = (padding * gridGap) / pixelRatio;
        const offsetLeft = left - paddingWidth;
        return offsetLeft / ((gridGap / pixelRatio) * 10) + beginTime;
    }

    seek(second) {
        errorHandle(typeof second === 'number', 'seek expects to receive number as a parameter.');
        this._currentTime = clamp(second, 0, this.duration);
        if (this.options.mediaElement && this.options.mediaElement.currentTime !== this._currentTime) {
            this.options.mediaElement.currentTime = this._currentTime;
        }
        this.update();
        return this;
    }

    changeChannel(channel) {
        this.decoder.changeChannel(channel);
        this.setOptions({ channel });
        this.update();
        return this;
    }

    exportImage() {
        this.template.exportImage();
        return this;
    }

    update() {
        if (this.template && this.drawer) {
            this.template.update();
            this.drawer.update();
        }
        return this;
    }

    destroy() {
        this.isDestroy = true;
        this.events.destroy();
        this.template.destroy();
        this.controller.destroy();
        this.decoder.destroy();
        this.loader.destroy();
        this.drawer.destroy();
        instances.splice(instances.indexOf(this), 1);
        return this;
    }
}

if (typeof window !== 'undefined') {
    window['WFPlayer'] = WFPlayer;
}
