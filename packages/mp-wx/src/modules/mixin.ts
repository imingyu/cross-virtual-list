import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponentMixin } from 'typescript-mp-component';
import type { BaseVirtualList } from '@cross-virtual-list/core';
import type {
    BaseVirtualListConfig,
    MpVirtualListComponentData,
    MpVirtualListComponentExports,
    MpVirtualListComponentProps
} from '@cross-virtual-list/types';
import { uuid } from './tool';
import { nextTick, selectBoundingClientRect } from 'cross-mp-power';

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
        bufferMultiple: {
            type: Number,
            value: 2
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
            optionalTypes: [String, Number],
            observer() {
                delete this.computedContainerSizeValue;
                delete this.containerSizeComputePromise;
                this.computeContainerSize();
                this.updateVlConfig(false);
                this.syncVlList();
            }
        },
        itemKeyField: {
            type: String,
            optionalTypes: [String, Array],
            observer() {
                this.updateVlConfig();
            }
        },
        state: {
            type: Object
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
            onItemSizeMayBeChange?: (component: any, index: 'all' | number) => void;
        }
    ) {
        super();
    }

    created() {
        this.selfHash = uuid();
        // eslint-disable-next-line new-cap
        this.$vl = new this.MixinConfig.adapter(this.getFinalConfig());
        this.computeContainerSize();
        this.checkReady();
    }
    attached() {
        this.isAttached = true;
    }
    getFinalConfig(): C {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return {
            ...this.MixinConfig.adapterConfigGetter(this),
            bufferMultiple: this.data.bufferMultiple || 1,
            viewportSize: this.computedContainerSizeValue || 0,
            itemKeyField: this.data.itemKeyField
        } as C;
    }
    emitInteract(e) {
        this.triggerEvent('interact', e.detail);
    }
    clear() {
        if (this.clearing) {
            return;
        }
        this.clearing = true;
        this.$vl.clear(true);
        this.MixinConfig.onItemSizeMayBeChange?.(this, 'all');
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
        this.MixinConfig.onItemSizeMayBeChange?.(this, 'all');
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
    replaceItemByKey(key: string | number | T, replacement: T | ((target: T) => void)): boolean {
        const [, index] = this.findItemByKey(key) || [];
        if (index !== undefined) {
            this.MixinConfig.onItemSizeMayBeChange?.(this, index);
        }
        const res = this.$vl.replaceItemByKey(key, replacement);
        if (res) {
            this.syncVlList();
        }
        return res;
    }
    removeItemByKey(key: string | number | T) {
        const [, index] = this.findItemByKey(key) || [];
        if (index !== undefined) {
            this.MixinConfig.onItemSizeMayBeChange?.(this, index);
        }
        this.$vl.removeItemByKey(key);
        this.syncVlList();
    }
    findItemByKey(key: string | number | T): [T, number] | undefined {
        return this.$vl.findItemByKey(key);
    }
    checkReady() {
        if (!this.isReady && this.computedContainerSizeValue) {
            this.isReady = true;
            const comExports: MpVirtualListComponentExports = {
                clear: this.clear.bind(this),
                setList: this.setList.bind(this),
                appendItem: this.appendItem.bind(this),
                appendItems: this.appendItems.bind(this),
                findItemByKey: this.findItemByKey.bind(this),
                replaceItemByKey: this.replaceItemByKey.bind(this),
                removeItemByKey: this.removeItemByKey.bind(this),
                ...(this.MixinConfig.readyExportsGetter?.(this) || {})
            };
            if (!this.isAttached) {
                nextTick(() => {
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
            this.containerSizeComputePromise = selectBoundingClientRect('.vl-container', this, undefined, 3).then(
                (res) => {
                    this.computedContainerSizeValue =
                        res[
                            this.data.scrollY ? 'height' : this.data.scrollX && !this.data.scrollY ? 'height' : 'width'
                        ];
                    this.updateVlConfig(false);
                    return this.computedContainerSizeValue;
                }
            );
        }
        return this.containerSizeComputePromise;
    }
    updateVlConfig(sync = true) {
        const change = (this.$vl.config.viewportSize || 0) !== (this.computedContainerSizeValue || 0);
        change && this.$vl.resetScrollSize();
        this.$vl.setConfig(this.getFinalConfig(), true);
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

            if (JSON.stringify(this.data.list) !== JSON.stringify(list)) {
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
        const sizeProp = isX ? 'width' : 'height';
        this.$vl.compute();
        const elListStyle = `${sizeProp}:${this.$vl.getSize().totalSize}px;`;
        const list = JSON.parse(
            JSON.stringify(
                this.$vl.getStartBufferList().concat(this.$vl.getShowList()).concat(this.$vl.getEndBufferList())
            )
        );
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
            nextTick(() => {
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
