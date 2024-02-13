import { DynamicSizeVirtualList } from '@cross-virtual-list/core';
import type {
    DynamicSizeVirtualListConfig,
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
    $mx = {
        adapter: new MpVirtualListComponentMixin<T, DynamicSizeVirtualListConfig>({
            adapter: DynamicSizeVirtualList,
            adapterConfigGetter: (ctx: MpDynamicSizeVirtualListComponent<T>) => {
                return {
                    itemMinSize: ctx.data.itemMinSize
                };
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
}

Component(toMpComponentConfig(MpDynamicSizeVirtualListComponent));
