import { DynamicSizeVirtualList } from '@cross-virtual-list/core';
import type {
    DynamicSizeVirtualListConfig,
    MpDynamicSizeVirtualListComponentProps,
    MpVirtualListComponentData
} from '@cross-virtual-list/types';
import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { MpVirtualListComponentMixin } from '../../modules/mixin';
import { getApiVarName, nextTick, selectAllBoundingClientRect, selectBoundingClientRect } from 'cross-mp-power';

const NeedDelayQuery = typeof BUILD_TARGET === 'string' ? BUILD_TARGET !== 'wx' : getApiVarName() !== 'wx';

class MpDynamicSizeVirtualListComponent<T = any> extends MpComponent<
    MpVirtualListComponentData,
    MpDynamicSizeVirtualListComponentProps
> {
    selfHash: string;
    queryHash = 0;
    querying: boolean;
    querySizeMaybeInaccurateIndex: Record<string, 1>;
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
                if (NeedDelayQuery) {
                    nextTick(() => {
                        ctx.queryListElementsSize();
                    });
                } else {
                    ctx.queryListElementsSize();
                }
            },
            onItemSizeMayBeChange(ctx: MpDynamicSizeVirtualListComponent<T>, index) {
                if (index === 'all') {
                    ctx.querySizeMaybeInaccurateIndex = {};
                    return;
                }
                delete ctx.querySizeMaybeInaccurateIndex[index];
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
    created() {
        this.querySizeMaybeInaccurateIndex = {};
    }
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
                let needReQuery;
                if (rects) {
                    rects.forEach((rect) => {
                        const index = rect.dataset.index;
                        const size = rect[sizeProp];
                        if (size > this.data.itemMinSize || index in this.querySizeMaybeInaccurateIndex) {
                            this.setItemSizeByIndex(parseInt(index), size);
                        } else {
                            // 标记这个可能查的不多，下次需要重查
                            this.querySizeMaybeInaccurateIndex[index] = 1;
                            needReQuery = true;
                        }
                    });
                }
                if (currentHash !== this.queryHash || needReQuery) {
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
