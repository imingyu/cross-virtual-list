import { RegularSizeVirtualList } from '@cross-virtual-list/core';
import type {
    MpRegularSizeVirtualListComponentProps,
    MpRegularSizeVirtualListComponentData,
    MpRegularSizeVirtualListComponentExports
} from '@cross-virtual-list/types';
import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { getBoundingClientRect } from '../tool';

class MpRegularSizeVirtualListComponent<T = any> extends MpComponent<
    MpRegularSizeVirtualListComponentData,
    MpRegularSizeVirtualListComponentProps
> {
    $vl: RegularSizeVirtualList<T>;
    /** 已经计算好的准去的容器尺寸 */
    computedContainerSizeValue?: number;
    containerSizeComputePromise?: Promise<number>;
    isReady: boolean;
    clearing: boolean;
    syncing: boolean;
    isAttached: boolean;
    options = {
        multipleSlots: true
    };
    properties: MpComponentProperties<MpRegularSizeVirtualListComponentProps, MpRegularSizeVirtualListComponent> = {
        scrollX: {
            type: Boolean,
            value: false
        },
        scrollY: {
            type: Boolean,
            value: true
        },
        itemSize: {
            type: Number,
            observer() {
                this.updateVlConfig();
            }
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
            observer() {
                this.updateVlConfig();
            }
        }
    };
    initData: MpRegularSizeVirtualListComponentData = {
        elListStyle: '',
        list: []
    };
    created() {
        this.$vl = new RegularSizeVirtualList({
            itemSize: this.data.itemSize || 0,
            viewportSize: 0
        });
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
        this.setData(
            {
                list: [],
                elListStyle: ''
            },
            () => {
                this.clearing = false;
            }
        );
    }
    checkReady() {
        if (!this.isReady) {
            if (this.data.itemSize && this.computedContainerSizeValue) {
                this.isReady = true;
                const comExports: MpRegularSizeVirtualListComponentExports = {
                    clear: () => {
                        this.clear();
                    },
                    setList: (val) => {
                        this.$vl.setList(val);
                        this.syncVlList();
                    },
                    appendItem: (item: T) => {
                        this.$vl.appendItem(item);
                        this.syncVlList();
                    },
                    appendItems: (items: T[]) => {
                        this.$vl.appendItems(items);
                        this.syncVlList();
                    }
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
                viewportSize: this.computedContainerSizeValue || 0,
                itemSize: this.data.itemSize,
                itemKeyField: this.data.itemKeyField
            },
            true
        );
        this.checkReady();
        sync && this.syncVlList();
    }
    comparisonSetData(sourceData: Partial<MpRegularSizeVirtualListComponentData>) {
        const { elListStyle, list } = sourceData;
        const renderData: Partial<MpRegularSizeVirtualListComponentData> = {};
        let needUpdate = false;
        if (elListStyle && elListStyle !== this.data.elListStyle) {
            renderData.elListStyle = elListStyle;
            needUpdate = true;
        }
        if (list) {
            if (list.length !== this.data.list.length) {
                renderData.list = list;
                this.setData(renderData);
                return;
            }
            const oldFirstIndex = this.data.list[0]?.index;
            const newFirstIndex = list[0]?.index;
            if (oldFirstIndex !== newFirstIndex) {
                renderData.list = list;
                this.setData(renderData);
                return;
            }
            const oldLastIndex = this.data.list[this.data.list.length - 1]?.index;
            const newLastIndex = list[list.length - 1]?.index;
            if (oldLastIndex !== newLastIndex) {
                renderData.list = list;
                this.setData(renderData);
                return;
            }
        }

        needUpdate && this.setData(renderData);
    }
    forceSyncVlList() {
        if (this.clearing) {
            return;
        }
        const isX = this.data.scrollX && !this.data.scrollY;
        const sizeProp = isX ? 'min-width' : 'min-height';
        const elListStyle = `${sizeProp}:${this.$vl.getSize().totalSize}px;`;
        const list = this.$vl.getStartBufferList().concat(this.$vl.getShowList()).concat(this.$vl.getEndBufferList());
        this.comparisonSetData({
            elListStyle,
            list
        });
    }
    syncVlList() {
        const promise = this.computeContainerSize();
        if (!this.computedContainerSizeValue) {
            promise.then(() => {
                if (!this.syncing) {
                    this.syncVlList();
                }
            });
        }

        if (!this.data.list.length) {
            this.forceSyncVlList();
            return;
        }
        if (this.syncing) {
            return;
        }
        const fire = () => {
            this.syncing = true;
            wx.nextTick(() => {
                this.syncing = false;
                this.forceSyncVlList();
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

Component(toMpComponentConfig(MpRegularSizeVirtualListComponent));
