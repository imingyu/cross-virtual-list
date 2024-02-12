export interface BaseVirtualListConfig<T extends object = any> {
    /** 视口尺寸 */
    viewportSize: number;
    /** 列表项本身就包含唯一key值；
     * 当此值为`true`时，将不在遍历循环自动填充key或检查key值的唯一性；
     */
    itemSelfHasKey?: boolean;
    /** 能标识列表项唯一的属性字段名，传多个时会将这些字段值合并，不传时默认使用id字段。
     * 当`itemSelfHasKey!==true`时，无论该配置传递什么值，本库都会计算(循环所有列表)并校验出一个唯一的key值，然后将这个最终key值放入列表项数据对象的`$vlKey`字段中。
     */
    itemKeyField?: string | string[];
    /** 是否需要向列表项对象填充索引值字段？
     * 如果你需要利用列表项的索引值做逻辑处理（如实现奇偶样式），那么此项配置可以传`true`。
     * 但你一旦这么做了，就代表虚拟列表内部会循环一次所有列表项，已达到填充索引值的目的，这可能会影响性能。
     * 最好的方式是你在创建整个列表时就已经在每个列表项上填充过索引值了。
     */
    itemNeedIndex?: boolean;
    /** itemNeedIndex=true时有效。
     * 代表列表项索引值的属性字段名称，不传时默认使用$vlIndex */
    itemIndexField?: string;
    /** itemNeedIndex=true时有效。
     * 当列表项上本来就存在配置的索引属性字段时，是否强制使用添加到虚拟列表时所处的索引值进行替换？ */
    itemIndexForceReplace?: boolean | ((item: T, realIndex: number) => boolean);
    /** 前置缓冲区预备展示的列表项数量 */
    startBufferCount?: number;
    /** 后置缓冲区预备展示的列表项数量 */
    endBufferCount?: number;
    /** 当调用虚拟列表类的`replace`方法时，具体执行什么样的替换逻辑？默认使用`Object.assign` */
    itemMerger?: (target: T, source: Partial<T>) => void;
}

export interface RegularSizeVirtualListConfig<T extends object = any> extends BaseVirtualListConfig<T> {
    /** 列表项尺寸 */
    itemSize: number;
}

export interface DynamicSizeVirtualListConfig<T extends object = any> extends BaseVirtualListConfig<T> {
    /** 列表项的最小尺寸 */
    itemMinSize: number;
    /** 视口尺寸 */
    viewportSize: number;
}

export type VirtualItemFieldSetter<T extends object = any> = (item: T, index: number) => void;
export type VirtualItemKeyFieldComputer<T extends object = any> = (item: T) => string | number;

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
