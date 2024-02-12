import { RegularSizeVirtualList } from '@cross-virtual-list/core';
import type {
    MpRegularSizeVirtualListComponentProps,
    MpRegularSizeVirtualListComponentData,
    RegularSizeVirtualListConfig,
    MpRegularSizeVirtualListComponentExports
} from '@cross-virtual-list/types';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { getBoundingClientRect } from '../tool';

class MpRegularSizeVirtualListComponent<T extends object = any> extends MpComponent<
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
        itemStyle: [],
        list: []
    };
    created() {
        this.$vl = new RegularSizeVirtualList({
            itemSize: this.data.itemSize || 0,
            itemNeedIndex: true,
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
                elListStyle: '',
                itemStyle: []
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
                    append: (...items: Array<T | T[]>) => {
                        this.$vl.append(...items);
                        this.syncVlList();
                    },
                    replace: (...args: any[]) => {
                        // eslint-disable-next-line prefer-spread
                        this.$vl.replace.apply(this.$vl, args);
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
    forceSyncVlList() {
        if (this.clearing) {
            return;
        }
        const isX = this.data.scrollX && !this.data.scrollY;
        const sizeProp = isX ? 'min-width' : 'min-height';
        const transformProp = isX ? 'translateX' : 'translateY';
        const elListStyle = `${sizeProp}:${this.$vl.getSize().totalSize}px;`;
        const list = this.$vl.getStartBufferList().concat(this.$vl.getShowList()).concat(this.$vl.getEndBufferList());
        const itemStyle = list.map((item) => {
            return `transform:${transformProp}(${this.$vl.getItemOffsetSizeByKey(item)}px);`;
        });
        this.setData({
            elListStyle,
            itemStyle,
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
