import type { VirtualItem } from './core';

export interface MpVirtualListComponentProps {
    /** 允许横向滚动，不可与scrollY同时设置为true，如果都为true时将优先以scrollY为准 */
    scrollX: boolean;
    /** 允许竖向滚动 */
    scrollY: boolean;
    /** 容器尺寸 */
    containerSize?: number;
    /** 容器尺寸HASH值，当值变化时将触发显示列表索引范围的重新计算 */
    containerSizeHash?: string;
    itemKeyField?: string | string[];
    /** 使用总列表数量计算出的用以撑开高度/宽度的容器样式 */
    contentStyle?: string;
}

export interface MpVirtualListComponentData<T = any> {
    elListStyle: string;
    list: VirtualItem<T>[];
    selfHash: string;
}

export interface MpVirtualListComponentExports<T = any> {
    clear: () => void;
    setList: (val: T[]) => void;
    appendItem: (item: T) => void;
    appendItems: (items: T[]) => void;
}

export interface MpClientRect {
    width: number;
    height: number;
    top: number;
    left: number;
    dataset: Record<string, any>;
}

export interface MpRegularSizeVirtualListComponentProps {
    /** 列表项尺寸 */
    itemSize: number;
}

export interface MpDynamicSizeVirtualListComponentProps {
    /** 列表项最小尺寸 */
    itemMinSize: number;
}
