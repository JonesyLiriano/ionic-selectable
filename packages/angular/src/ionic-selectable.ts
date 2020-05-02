import { EventEmitter, ChangeDetectorRef, ElementRef, NgZone, Component, ChangeDetectionStrategy } from "@angular/core";
import { proxyOutputs, ProxyCmp } from "./proxies-utils";

@ProxyCmp({ inputs: ["value"], "methods": ["open"] })
@Component({ selector: "ionic-selectable", changeDetection: ChangeDetectionStrategy.OnPush, template: "<ng-content></ng-content>", inputs: ["cancelText", "compareWith", "disabled", "interface", "interfaceOptions", "mode", "multiple", "name", "okText", "placeholder", "selectedText", "value"] })
export class IonicSelectable {
    onChanged!: EventEmitter<CustomEvent>;
    protected el: HTMLElement;
    constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
        c.detach();
        this.el = r.nativeElement;
        proxyOutputs(this, this.el, ["onChanged"]);
    }
}