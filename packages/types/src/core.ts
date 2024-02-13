export interface BaseVirtualListConfig {
    /** 视口尺寸 */
    viewportSize: number;
    /** 能标识列表项唯一的属性字段名，传多个时会将这些字段值合并，不传时默认使用`id`字段 */
    itemKeyField?: string | string[];
    /** 前置缓冲区预备展示的列表项数量 */
    startBufferCount?: number;
    /** 后置缓冲区预备展示的列表项数量 */
    endBufferCount?: number;
}

export interface RegularSizeVirtualListConfig extends BaseVirtualListConfig {
    /** 列表项尺寸 */
    itemSize: number;
}

export interface DynamicSizeVirtualListConfig extends BaseVirtualListConfig {
    /** 列表项的最小尺寸 */
    itemMinSize: number;
    /** 视口尺寸 */
    viewportSize: number;
}

export type VirtualItemKeyFieldComputer<T = any> = (item: T) => any;

export interface VirtualListRange {
    showListBeginIndex: number;
    showListEndIndex: number;
    startBufferBeginIndex: number;
    startBufferEndIndex: number;
    endBufferBeginIndex: number;
    endBufferEndIndex: number;
}

export interface VirtualListScrollStartSizeChangeEvent {
    startSize: number;
}

export interface VirtualItem<T = any> {
    item: T;
    index: number;
    key: string;
    offset: number;
}
