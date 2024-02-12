export interface MpRegularSizeVirtualListComponentProps {
    /** 允许横向滚动，不可与scrollY同时设置为true，如果都为true时将优先以scrollY为准 */
    scrollX: boolean;
    /** 允许竖向滚动 */
    scrollY: boolean;
    /** 列表项尺寸 */
    itemSize: number;
    /** 容器尺寸 */
    containerSize?: number;
    /** 容器尺寸HASH值，当值变化时将触发显示列表索引范围的重新计算 */
    containerSizeHash?: string;
}

export interface MpRegularSizeVirtualListComponentData<T extends object = any> {
    elListStyle: string;
    itemStyle: string[];
    list: T[];
}

export interface MpVirtualListItemReplacer<T extends object = any> {
    (replaceValue: Partial<T>, merger?: (target: T, source: Partial<T>) => void): void;
    (findItemKey: string | number, replaceValue: Partial<T>, merger?: (target: T, source: Partial<T>) => void): void;
    (
        findItemKeyOrReplaceValue: string | number | T,
        replaceValue?: Partial<T> | ((target: T, source: Partial<T>) => void),
        merger?: (target: T, source: Partial<T>) => void
    ): void;
}

export interface MpRegularSizeVirtualListComponentExports<T extends object = any> {
    clear: () => void;
    setList: (val: T[]) => void;
    append: (...items: Array<T | T[]>) => void;
    replace: MpVirtualListItemReplacer<T>;
}

export interface MpClientRect {
    width: number;
    height: number;
    top: number;
    left: number;
}
