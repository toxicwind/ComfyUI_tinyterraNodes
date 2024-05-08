import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

class SeedControl {
    constructor(node) {
        this.lastSeed = undefined;
        this.serializedCtx = {};
        this.lastSeedValue = null;
        this.node = node;

        this.node.properties = this.node.properties || {};
        for (const [i, w] of this.node.widgets.entries()) {
            if (w.name === "seed" || w.name === "noise_seed") {
                this.seedWidget = w;
            }
            else if (w.name === "control_after_generate") {
                this.controlWidget = w;
            }
        }
        if (!this.seedWidget) {
            throw new Error("Something's wrong; expected seed widget");
        }
        const randMax = Math.min(1125899906842624, this.seedWidget.options.max);
        const randMin = Math.max(0, this.seedWidget.options.min);
        const randomRange = (randMax - Math.max(0, randMin)) / (this.seedWidget.options.step / 10);
        this.randomSeedButton = this.node.addWidget("button", "🎲 New Fixed Random", null, () => {
            this.seedWidget.value =
                Math.floor(Math.random() * randomRange) * (this.seedWidget.options.step / 10) + randMin;
            this.controlWidget.value = "fixed";
        }, { serialize: false });

        this.seedWidget.linkedWidgets = [this.randomSeedButton, this.controlWidget];
    }
}

function addTextDisplay(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated?.apply(this, arguments);
        const w = ComfyWidgets["STRING"](this, "text", ["STRING", { multiline: true, placeholder: " " }], app).widget;
        w.inputEl.readOnly = true;
        w.inputEl.style.opacity = 0.7;
        w.inputEl.style.cursor = "auto";
        return r;
    };

    const onExecuted = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function (message) {
        onExecuted?.apply(this, arguments);

        for (const widget of this.widgets) {
            if (widget.type === "customtext"){
                widget.value = message.text.join('');
            }
        }
        
        this.onResize?.(this.size);
    };
}

function overwriteSeedControl(nodeType) {
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
        onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
        this.seedControl = new SeedControl(this);
    }
}

app.registerExtension({
    name: "comfy.ttN.widgets",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name.startsWith("ttN ") && ["ttN pipeLoader_v2", "ttN pipeKSampler_v2", "ttN pipeKSamplerAdvanced_v2", "ttN pipeLoaderSDXL_v2", "ttN pipeKSamplerSDXL_v2", "ttN KSampler_v2"].includes(nodeData.name)) {
            if (nodeData.output_name.includes('seed')) {
                overwriteSeedControl(nodeType)
            }
        }
        if (["ttN textDebug", "ttN advPlot range", "ttN debugInput"].includes(nodeData.name)) {
            addTextDisplay(nodeType)
        }
    }
}); 