import { RegularSizeVirtualList } from '@cross-virtual-list/core';
import type {
    MpRegularSizeVirtualListComponentProps,
    MpRegularSizeVirtualListComponentData,
    RegularSizeVirtualListConfig,
    MpRegularSizeVirtualListComponentExports
} from '@cross-virtual-list/types';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { getBoundingClientRect } from '../tool';

class MpRegularSizeVirtualListComponent<T = any> extends MpComponent<
    MpRegularSizeVirtualListComponentData,
    MpRegularSizeVirtualListComponentProps
> {
    $vl: RegularSizeVirtualList<T>;
    /** 已经计算好的准去的容器尺寸 */
    computedContainerSize?: number;
    containerSizeComputePromise?: Promise<number>;
    isReady: boolean;
    clearing: boolean;
    syncing: boolean;
    options = {
        multipleSlots: true
    };
    properties = {
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
            observer(val: number) {
                this.updateVlConfig({
                    itemSize: val
                });
            }
        },
        containerSize: {
            type: Number,
            observer() {
                delete this.computedContainerSize;
                this.syncVlList();
            }
        },
        containerSizeHash: {
            type: String,
            observer() {
                delete this.computedContainerSize;
                this.syncVlList();
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
        this.computeContainerHeight();
        this.checkReady();
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
            if (this.data.itemSize && this.computedContainerSize) {
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
                this.triggerEvent('ready', comExports);
            }
        }
    }
    computeContainerHeight(): Promise<number> {
        if (this.computedContainerSize) {
            return this.containerSizeComputePromise as Promise<number>;
        }
        if (typeof this.data.containerSize === 'number' && this.data.containerSize > 0) {
            this.computedContainerSize = this.data.containerSize;
            this.containerSizeComputePromise = Promise.resolve(this.computedContainerSize);
            this.updateVlConfig(
                {
                    viewportSize: this.computedContainerSize
                },
                false
            );
            return this.containerSizeComputePromise;
        }
        if (!this.containerSizeComputePromise) {
            this.containerSizeComputePromise = getBoundingClientRect(this, '.vl-container').then((res) => {
                this.computedContainerSize =
                    res[this.data.scrollY ? 'height' : this.data.scrollX && !this.data.scrollY ? 'height' : 'width'];
                this.updateVlConfig(
                    {
                        viewportSize: this.computedContainerSize
                    },
                    false
                );
                return this.computedContainerSize;
            });
        }
        return this.containerSizeComputePromise;
    }
    updateVlConfig(config: Partial<RegularSizeVirtualListConfig>, sync = true) {
        this.$vl.setConfig(config, true);
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
        this.computeContainerHeight();
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
