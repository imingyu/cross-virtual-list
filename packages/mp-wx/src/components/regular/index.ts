import { RegularSizeVirtualList } from '@cross-virtual-list/core';
import type {
    MpRegularSizeVirtualListComponentProps,
    MpVirtualListComponentData,
    RegularSizeVirtualListConfig
} from '@cross-virtual-list/types';
import type { MpComponentProperties } from 'typescript-mp-component';
import { MpComponent, toMpComponentConfig } from 'typescript-mp-component';
import { MpVirtualListComponentMixin } from '../../modules/mixin';

class MpRegularSizeVirtualListComponent<T = any> extends MpComponent<
    MpVirtualListComponentData,
    MpRegularSizeVirtualListComponentProps
> {
    $mx = {
        adapter: new MpVirtualListComponentMixin<T, RegularSizeVirtualListConfig, RegularSizeVirtualList>({
            adapter: RegularSizeVirtualList,
            adapterConfigGetter: (ctx: MpRegularSizeVirtualListComponent<T>) => {
                return {
                    itemSize: ctx.data.itemSize
                };
            }
        })
    };
    options = {
        multipleSlots: true
    };
    properties: MpComponentProperties<MpRegularSizeVirtualListComponentProps, MpRegularSizeVirtualListComponent> = {
        itemSize: {
            type: Number,
            observer() {
                this.$mx.adapter.updateVlConfig();
            }
        }
    };
}

Component(toMpComponentConfig(MpRegularSizeVirtualListComponent));
