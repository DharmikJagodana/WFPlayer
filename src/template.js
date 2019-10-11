import { errorHandle } from './utils';

export default class Template {
    constructor(wf) {
        this.wf = wf;
        this.canvas = null;
        this.update();
    }

    update() {
        const { container, pixelRatio } = this.wf.options;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        if (this.canvas) {
            this.canvas.width = containerWidth * pixelRatio;
            this.canvas.height = containerHeight * pixelRatio;
        } else {
            container.innerHTML = '';
            errorHandle(containerWidth && containerHeight, 'The width and height of the container cannot be 0');
            this.canvas = document.createElement('canvas');
            this.canvas.width = containerWidth * pixelRatio;
            this.canvas.height = containerHeight * pixelRatio;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            container.appendChild(this.canvas);
        }
    }

    exportImage() {
        //
    }

    destroy() {
        this.wf.options.container.innerHTML = '';
    }
}
