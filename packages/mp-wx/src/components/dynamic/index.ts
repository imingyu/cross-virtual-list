import { DynamicSizeVirtualList } from '@cross-virtual-list/core';
import type {
    DynamicSizeVirtualListConfig,
    MpDynamicSizeVirtualListComponentProps,
    MpVirtualListComponentData
} from '@cross-virtual-list/types';
import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { MpVirtualListComponentMixin } from '../../modules/mixin';
import { selectAllBoundingClientRect, selectBoundingClientRect } from 'cross-mp-power';

class MpDynamicSizeVirtualListComponent<T = any> extends MpComponent<
    MpVirtualListComponentData,
    MpDynamicSizeVirtualListComponentProps
> {
    selfHash: string;
    queryHash = 0;
    querying: boolean;
    createSelectorQuery: (...args: any[]) => any;
    $mx = {
        adapter: new MpVirtualListComponentMixin<T, DynamicSizeVirtualListConfig, DynamicSizeVirtualList>({
            adapter: DynamicSizeVirtualList,
            adapterConfigGetter: (ctx: MpDynamicSizeVirtualListComponent<T>) => {
                return {
                    itemMinSize: ctx.data.itemMinSize
                };
            },
            readyExportsGetter: (ctx: MpDynamicSizeVirtualListComponent<T>) => {
                return {
                    setItemSizeByKey: ctx.setItemSizeByKey.bind(ctx),
                    setItemSizeByIndex: ctx.setItemSizeByIndex.bind(ctx),
                    reQueryItemElementSizeByIndex: ctx.reQueryItemElementSizeByIndex.bind(ctx),
                    reQueryItemElementSizeByKey: ctx.reQueryItemElementSizeByKey.bind(ctx)
                };
            },
            onRenderDone: (ctx: MpDynamicSizeVirtualListComponent<T>) => {
                ctx.queryListElementsSize();
            }
        })
    };
    options = {
        multipleSlots: true
    };
    properties: MpComponentProperties<MpDynamicSizeVirtualListComponentProps, MpDynamicSizeVirtualListComponent> = {
        itemMinSize: {
            type: Number,
            observer() {
                this.$mx.adapter.updateVlConfig();
            }
        }
    };
    setItemSizeByKey(itemKey: string | number | T, size: number) {
        this.$mx.adapter.$vl.setItemSizeByKey(itemKey, size, false);
        this.$mx.adapter.syncVlList();
    }
    setItemSizeByIndex(itemIndex: number, size: number) {
        this.$mx.adapter.$vl.setItemSizeByIndex(itemIndex, size, false);
        this.$mx.adapter.syncVlList();
    }
    reQueryItemElementSizeByIndex(itemIndex: number) {
        selectBoundingClientRect(`.vl-hash-${this.selfHash}.vl-index-${itemIndex}`, this, undefined, 2)
            .then((rect) => {
                const sizeProp = this.$mx.adapter.data.scrollX && !this.$mx.adapter.data.scrollY ? 'width' : 'height';
                this.setItemSizeByIndex(itemIndex, rect[sizeProp]);
            })
            .catch(() => {});
    }
    reQueryItemElementSizeByKey(itemKey: string | number | T) {
        const [, index] = this.$mx.adapter.$vl.findItemByKey(itemKey) || [];
        if (typeof index !== 'number') {
            return;
        }
        this.reQueryItemElementSizeByIndex(index);
    }
    checkItemSizeReady(itemIndex: number) {
        return this.$mx.adapter.$vl.checkItemSizeReady(itemIndex);
    }
    queryListElementsSize() {
        let allItemSizeIsReady = true;
        for (let i = 0, len = this.data.list?.length || 0; i < len; i++) {
            allItemSizeIsReady = this.checkItemSizeReady(this.data.list[i].index);
            if (!allItemSizeIsReady) {
                break;
            }
        }
        if (allItemSizeIsReady) {
            return;
        }
        this.queryHash++;
        const currentHash = this.queryHash;
        if (this.querying) {
            return;
        }
        this.querying = true;
        selectAllBoundingClientRect(`.vl-hash-${this.selfHash}`, this)
            .catch(() => {})
            .then((rects) => {
                this.querying = false;
                const sizeProp = this.$mx.adapter.data.scrollX && !this.$mx.adapter.data.scrollY ? 'width' : 'height';
                if (rects) {
                    rects.forEach((rect) => {
                        const index = rect.dataset.index;
                        this.setItemSizeByIndex(parseInt(index), rect[sizeProp]);
                    });
                }
                if (currentHash !== this.queryHash) {
                    this.queryListElementsSize();
                } else {
                    this.queryHash = 0;
                }
            });
    }
}

const config = toMpComponentConfig(MpDynamicSizeVirtualListComponent);
if (typeof COMPILE_COMPONENT !== 'undefined') {
    COMPILE_COMPONENT(config);
} else {
    Component(config);
}
