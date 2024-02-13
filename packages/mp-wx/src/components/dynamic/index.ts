import { DynamicSizeVirtualList } from '@cross-virtual-list/core';
import type {
    DynamicSizeVirtualListConfig,
    MpClientRect,
    MpDynamicSizeVirtualListComponentProps,
    MpVirtualListComponentData
} from '@cross-virtual-list/types';
import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { MpVirtualListComponentMixin } from '../../modules/mixin';

class MpDynamicSizeVirtualListComponent<T = any> extends MpComponent<
    MpVirtualListComponentData,
    MpDynamicSizeVirtualListComponentProps
> {
    selfHash: string;
    queryHash = 0;
    querying: boolean;
    queryStartIndex: number;
    queryEndIndex: number;
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
                    setItemSizeByIndex: ctx.setItemSizeByIndex.bind(ctx)
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
    checkItemSizeReady(itemIndex: number) {
        return this.$mx.adapter.$vl.checkItemSizeReady(itemIndex);
    }
    queryListElementsSize() {
        const currentQueryStartIndex = this.data.list[0].index;
        const currentQueryEndIndex = this.data.list[this.data.list.length - 1].index;
        if (currentQueryStartIndex === this.queryStartIndex && currentQueryEndIndex === this.queryEndIndex) {
            return;
        }
        let allItemSizeIsReady = true;
        for (let i = currentQueryStartIndex; i <= currentQueryEndIndex; i++) {
            allItemSizeIsReady = this.checkItemSizeReady(i);
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
        const fire = () => {
            this.querying = true;
            this.queryStartIndex = this.data.list[0].index;
            this.queryEndIndex = this.data.list[this.data.list.length - 1].index;
            this.createSelectorQuery()
                .selectAll(`.vl-hash-${this.selfHash}`)
                .boundingClientRect((rects: MpClientRect[]) => {
                    this.querying = false;
                    const sizeProp =
                        this.$mx.adapter.data.scrollX && !this.$mx.adapter.data.scrollY ? 'width' : 'height';
                    rects.forEach((rect) => {
                        const index = rect.dataset.index;
                        this.setItemSizeByIndex(parseInt(index), rect[sizeProp]);
                    });
                    if (currentHash !== this.queryHash) {
                        this.queryListElementsSize();
                    } else {
                        this.queryHash = 0;
                    }
                })
                .exec();
        };
        fire();
    }
}

Component(toMpComponentConfig(MpDynamicSizeVirtualListComponent));
