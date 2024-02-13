import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponentMixin } from 'typescript-mp-component';
import type { BaseVirtualList } from '@cross-virtual-list/core';
import type {
    BaseVirtualListConfig,
    MpVirtualListComponentData,
    MpVirtualListComponentExports,
    MpVirtualListComponentProps
} from '@cross-virtual-list/types';
import { getBoundingClientRect, uuid } from './tool';

export class MpVirtualListComponentMixin<
    T = any,
    C extends BaseVirtualListConfig = BaseVirtualListConfig,
    A extends BaseVirtualList<T> = BaseVirtualList<T>
> extends MpComponentMixin<MpVirtualListComponentData, MpVirtualListComponentProps, MpVirtualListComponentMixin> {
    $vl: A;
    /** 已经计算好的准去的容器尺寸 */
    computedContainerSizeValue?: number;
    containerSizeComputePromise?: Promise<number>;
    isReady: boolean;
    clearing: boolean;
    syncing: boolean;
    isAttached: boolean;
    selfHash: string;
    syncHash = 0;

    properties: MpComponentProperties<MpVirtualListComponentProps, MpVirtualListComponentMixin<T>> = {
        scrollX: {
            type: Boolean,
            value: false
        },
        scrollY: {
            type: Boolean,
            value: true
        },
        contentStyle: String,
        containerSize: {
            type: Number,
            observer() {
                delete this.computedContainerSizeValue;
                this.computeContainerSize();
                this.updateVlConfig();
            }
        },
        containerSizeHash: {
            type: String,
            observer() {
                delete this.computedContainerSizeValue;
                delete this.containerSizeComputePromise;
                this.computeContainerSize();
                this.updateVlConfig(false);
                this.syncVlList();
            }
        },
        itemKeyField: {
            type: null,
            optionalTypes: [String, Array],
            observer() {
                this.updateVlConfig();
            }
        }
    };
    initData: MpVirtualListComponentData = {
        elListStyle: '',
        selfHash: '',
        list: []
    };

    constructor(
        public MixinConfig: {
            adapter: new (config: C) => A;
            adapterConfigGetter: (component: any) => Partial<C>;
            readyExportsGetter?: (component: any) => Record<string, (...args: any[]) => any>;
            onRenderDone?: (component: any) => void;
        }
    ) {
        super();
    }

    created() {
        this.selfHash = uuid();
        const config = this.MixinConfig.adapterConfigGetter(this);
        // eslint-disable-next-line new-cap
        this.$vl = new this.MixinConfig.adapter(config as C);
        this.computeContainerSize();
        this.checkReady();
    }
    attached() {
        this.isAttached = true;
    }
    clear() {
        if (this.clearing) {
            return;
        }
        this.clearing = true;
        this.$vl.clear(true);
        this.fireRender(
            {
                list: [],
                elListStyle: '',
                selfHash: this.selfHash
            },
            () => {
                this.clearing = false;
            }
        );
    }
    setList(val: T[]) {
        this.$vl.setList(val);
        this.syncVlList();
    }
    appendItem(item: T) {
        this.$vl.appendItem(item);
        this.syncVlList();
    }
    appendItems(items: T[]) {
        this.$vl.appendItems(items);
        this.syncVlList();
    }
    checkReady() {
        if (!this.isReady && this.computedContainerSizeValue) {
            this.isReady = true;
            const comExports: MpVirtualListComponentExports = {
                clear: this.clear.bind(this),
                setList: this.setList.bind(this),
                appendItem: this.appendItem.bind(this),
                appendItems: this.appendItems.bind(this),
                ...(this.MixinConfig.readyExportsGetter?.(this) || {})
            };
            if (!this.isAttached) {
                wx.nextTick(() => {
                    this.triggerEvent('ready', comExports);
                });
            } else {
                this.triggerEvent('ready', comExports);
            }
        }
    }
    computeContainerSize(): Promise<number> {
        if (this.computedContainerSizeValue) {
            return this.containerSizeComputePromise as Promise<number>;
        }
        if (typeof this.data.containerSize === 'number' && this.data.containerSize > 0) {
            this.computedContainerSizeValue = this.data.containerSize;
            this.containerSizeComputePromise = Promise.resolve(this.computedContainerSizeValue);
            this.updateVlConfig(false);
            return this.containerSizeComputePromise;
        }
        if (!this.containerSizeComputePromise) {
            this.containerSizeComputePromise = getBoundingClientRect(this, '.vl-container').then((res) => {
                this.computedContainerSizeValue =
                    res[this.data.scrollY ? 'height' : this.data.scrollX && !this.data.scrollY ? 'height' : 'width'];
                this.updateVlConfig(false);
                return this.computedContainerSizeValue;
            });
        }
        return this.containerSizeComputePromise;
    }
    updateVlConfig(sync = true) {
        this.$vl.setConfig(
            {
                ...this.MixinConfig.adapterConfigGetter(this),
                viewportSize: this.computedContainerSizeValue || 0,
                itemKeyField: this.data.itemKeyField
            },
            true
        );
        this.checkReady();
        sync && this.syncVlList();
    }
    fireRender(data: Partial<MpVirtualListComponentData>, done?: () => void) {
        this.setData(data, () => {
            done?.();
            this.MixinConfig.onRenderDone?.(this);
        });
    }
    comparisonSetData(sourceData: Partial<MpVirtualListComponentData>) {
        const { elListStyle, list, selfHash } = sourceData;
        const renderData: Partial<MpVirtualListComponentData> = {};
        let needUpdate = false;
        if (elListStyle !== this.data.elListStyle) {
            renderData.elListStyle = elListStyle || '';
            needUpdate = true;
        }
        if (selfHash && selfHash !== this.data.selfHash) {
            renderData.selfHash = selfHash || '';
            needUpdate = true;
        }
        if (list) {
            if (list.length !== this.data.list.length) {
                renderData.list = list;
                this.fireRender(renderData);
                return;
            }
            const oldFirstIndex = this.data.list[0]?.index;
            const newFirstIndex = list[0]?.index;
            if (oldFirstIndex !== newFirstIndex) {
                renderData.list = list;
                this.fireRender(renderData);
                return;
            }
            const oldLastIndex = this.data.list[this.data.list.length - 1]?.index;
            const newLastIndex = list[list.length - 1]?.index;
            if (oldLastIndex !== newLastIndex) {
                renderData.list = list;
                this.fireRender(renderData);
                return;
            }
            const oldLastOffset = this.data.list[this.data.list.length - 1]?.offset;
            const newLastOffset = list[list.length - 1]?.offset;
            if (oldLastOffset !== newLastOffset) {
                renderData.list = list;
                this.fireRender(renderData);
                return;
            }
        }

        needUpdate && this.fireRender(renderData);
    }
    forceSyncVlList() {
        if (this.clearing) {
            return;
        }
        const isX = this.data.scrollX && !this.data.scrollY;
        const sizeProp = isX ? 'min-width' : 'min-height';
        this.$vl.compute();
        const elListStyle = `${sizeProp}:${this.$vl.getSize().totalSize}px;`;
        const list = this.$vl.getStartBufferList().concat(this.$vl.getShowList()).concat(this.$vl.getEndBufferList());
        this.comparisonSetData({
            elListStyle,
            list,
            selfHash: this.selfHash
        });
    }
    syncVlList() {
        const promise = this.computeContainerSize();
        if (!this.computedContainerSizeValue) {
            promise.then(() => {
                this.syncVlList();
            });
        }

        if (!this.data.list.length) {
            this.forceSyncVlList();
            return;
        }
        this.syncHash++;
        const currentHash = this.syncHash;
        if (this.syncing) {
            return;
        }
        const fire = () => {
            this.syncing = true;
            wx.nextTick(() => {
                this.syncing = false;
                this.forceSyncVlList();
                if (currentHash !== this.syncHash) {
                    this.syncVlList();
                } else {
                    this.syncHash = 0;
                }
            });
        };
        fire();
    }
    onScroll(e) {
        if (this.clearing) {
            return;
        }
        // 单位：px
        const { scrollLeft, scrollTop } = e.detail as Record<string, number>;
        const startSize = this.data.scrollX && !this.data.scrollY ? scrollLeft : scrollTop;
        this.$vl.onScrollStartSizeChange({ startSize });
        this.syncVlList();
    }
}
