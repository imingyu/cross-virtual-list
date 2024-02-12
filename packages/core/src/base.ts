/**
 *
 * 容器：所有列表项撑起的总高度；
 * 可视区域：固定高度古尔邦节列表项高度显示多个列表项；
 * 前置缓冲区：
 * 后置缓冲区：
 */

import type {
    VirtualItemFieldSetter,
    VirtualItemKeyFieldComputer,
    BaseVirtualListConfig,
    VirtualListRange,
    VirtualListScrollStartSizeChangeEvent
} from '@cross-virtual-list/types';

export abstract class BaseVirtualList<
    T extends object = any,
    C extends BaseVirtualListConfig<T> = BaseVirtualListConfig
> {
    config: C;
    oldScrollStartSize = 0;
    nowScrollStartSize = 0;
    allList: T[];
    protected itemIndex: Record<string, number>;
    protected totalSize = 0;
    protected startBufferBeginIndex = -1;
    protected startBufferEndIndex = -1;
    protected endBufferBeginIndex = -1;
    protected endBufferEndIndex = -1;
    protected showListBeginIndex = -1;
    protected showListEndIndex = -1;
    protected scrollLocked = false;
    protected itemIndexSetter?: VirtualItemFieldSetter<T>;
    protected itemKeyComputer?: VirtualItemKeyFieldComputer<T>;
    protected keyMark: Record<string, 1> = {};
    private uuid = 0;

    constructor(config: C) {
        this.allList = [];
        this.itemIndex = {};
        this.setConfig(config);
    }

    setConfig(config: Partial<C>, merge = true) {
        delete this.itemKeyComputer;
        delete this.itemIndexSetter;
        if (!merge) {
            this.config = config as C;
        } else if (!this.config) {
            this.config = config as C;
        } else {
            Object.assign(this.config, config);
        }
        this.setItemFieldWrapper();
    }

    setList(list: T[]) {
        this.clear(false);
        let { itemSelfHasKey, itemNeedIndex, itemIndexField } = this.config;
        itemIndexField = itemIndexField || '$vlIndex';
        const needEach = !itemSelfHasKey || (itemNeedIndex && typeof list[0][itemIndexField] === 'number');
        if (needEach) {
            this.noComputeAppend(list);
        } else {
            this.allList = list.concat([]);
        }
        this.compute();
    }

    append(...items: Array<T | T[]>) {
        this.noComputeAppend(...items);
        this.compute();
    }

    noComputeAppend(...items: Array<T | T[]>) {
        const len = this.allList.length;
        items.forEach((item, i) => {
            let currentIndex = i;
            if (Array.isArray(item)) {
                item.forEach((t, ti) => {
                    this.addItem(t, len + currentIndex + ti);
                });
                currentIndex += item.length;
                return;
            }
            this.addItem(item, len + currentIndex);
        });
    }

    replace(item: T, merger?: (target: T, source: Partial<T>) => void);
    replace(itemKey: string | number, item: Partial<T>, merger?: (target: T, source: Partial<T>) => void);
    replace(
        itemKey: string | number | T,
        item?: Partial<T> | ((target: T, source: Partial<T>) => void),
        merger?: (target: T, source: Partial<T>) => void
    ) {
        if (typeof itemKey === 'object') {
            if (!itemKey) {
                return;
            }
            const targetKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(itemKey);
            this.replace(targetKey, itemKey, merger);
            return;
        }
        const targetItem = this.findItemByKey(itemKey);
        if (targetItem) {
            (merger || this.config.itemMerger || Object.assign)(targetItem[0], item as T);
        }
    }

    clear(fireCompute = true) {
        this.allList = [];
        this.itemIndex = {};
        this.totalSize = 0;
        delete this.itemKeyComputer;
        delete this.itemIndexSetter;
        this.uuid = 0;
        this.showListBeginIndex =
            this.showListEndIndex =
            this.startBufferBeginIndex =
            this.startBufferEndIndex =
            this.endBufferBeginIndex =
            this.endBufferEndIndex =
                -1;
        this.setConfig(this.config);
        fireCompute && this.compute();
    }

    lockScroll() {
        this.scrollLocked = true;
    }
    unlockScroll() {
        this.scrollLocked = false;
    }

    getShowList(): Array<{ $vlKey: string } & T> {
        if (this.showListBeginIndex === -1) {
            return [];
        }
        return this.allList.slice(this.showListBeginIndex, this.showListEndIndex + 1) as Array<{ $vlKey: string } & T>;
    }

    isShowEnd() {
        return this.allList.length - 1 === this.showListEndIndex;
    }

    getStartBufferList(): Array<{ $vlKey: string } & T> {
        if (this.startBufferBeginIndex === -1) {
            return [];
        }
        if (this.startBufferBeginIndex === this.startBufferEndIndex) {
            return [this.allList[this.startBufferBeginIndex]] as Array<{ $vlKey: string } & T>;
        }
        return this.allList.slice(this.startBufferBeginIndex, this.startBufferEndIndex + 1) as Array<
            { $vlKey: string } & T
        >;
    }

    getEndBufferList(): Array<{ $vlKey: string } & T> {
        if (this.endBufferBeginIndex === -1) {
            return [];
        }
        if (this.endBufferBeginIndex === this.endBufferEndIndex) {
            return [this.allList[this.endBufferBeginIndex]] as Array<{ $vlKey: string } & T>;
        }
        return this.allList.slice(this.endBufferBeginIndex, this.endBufferEndIndex + 1) as Array<
            { $vlKey: string } & T
        >;
    }

    getSize() {
        return {
            totalSize: this.totalSize,
            nowScrollStartSize: this.nowScrollStartSize,
            oldScrollStartSize: this.oldScrollStartSize
        };
    }

    resetScrollSize() {
        this.oldScrollStartSize = this.nowScrollStartSize = 0;
    }

    // 当发生滚动行为时，外部调用该方法，将滚动距离传入
    onScrollStartSizeChange(event: VirtualListScrollStartSizeChangeEvent) {
        if (this.scrollLocked) {
            return;
        }
        this.oldScrollStartSize = this.nowScrollStartSize;
        this.nowScrollStartSize = event.startSize;
        this.compute();
    }

    compute() {
        if (!this.allList.length) {
            this.showListBeginIndex =
                this.showListEndIndex =
                this.startBufferBeginIndex =
                this.startBufferEndIndex =
                this.endBufferBeginIndex =
                this.endBufferEndIndex =
                    -1;
            this.totalSize = 0;
            return;
        }
        this.totalSize = this.getTotalSize();
        const range = this.computeRange();
        Object.assign(this, range);
    }

    protected findItemByKey(keyOrItemSelf: string | number | T): [T, number] | undefined {
        if (typeof keyOrItemSelf === 'object') {
            if (!keyOrItemSelf) {
                return;
            }
            const targetKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(keyOrItemSelf);
            return this.findItemByKey(targetKey);
        }
        if (keyOrItemSelf in this.itemIndex) {
            return [this.allList[this.itemIndex[keyOrItemSelf]], this.itemIndex[keyOrItemSelf]];
        }
        const index = this.allList.findIndex((t, index) => {
            (this.itemIndexSetter as VirtualItemFieldSetter<T>)(t, index);
            const sourceKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(t);
            return sourceKey === keyOrItemSelf;
        });
        if (index !== -1) {
            return [this.allList[index], index];
        }
    }

    protected addItem(item: T, finalIndex: number) {
        (this.itemIndexSetter as VirtualItemFieldSetter<T>)(item, finalIndex);
        const key = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item);
        this.itemIndex[key] = finalIndex;
        this.allList[finalIndex] = item;
    }

    protected setItemFieldWrapper() {
        const { itemNeedIndex, itemIndexField, itemIndexForceReplace, itemKeyField, itemSelfHasKey } = this.config;
        if (!this.itemKeyComputer) {
            let finalItemKeyField = itemKeyField || 'id';
            this.itemKeyComputer = (item: any) => {
                if (!itemSelfHasKey && item.$vlKey !== undefined) {
                    return item.$vlKey;
                }
                if (Array.isArray(finalItemKeyField)) {
                    if (finalItemKeyField.length > 1) {
                        let key = finalItemKeyField.reduce((sum, k) => {
                            return sum + (typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k]);
                        }, '');
                        if (!itemSelfHasKey) {
                            if (key in this.keyMark) {
                                key += String(this.uuid++);
                            }
                            this.keyMark[key] = 1;
                        }
                        item.$vlKey = key;
                        return key;
                    }
                    finalItemKeyField = finalItemKeyField[0];
                }
                let key = item[finalItemKeyField];
                if (!itemSelfHasKey) {
                    if (key === undefined) {
                        key = String(this.uuid++);
                    }
                    if (key in this.keyMark) {
                        key += String(this.uuid++);
                    }
                    item.$vlKey = key;
                    this.keyMark[key] = 1;
                }
                return key;
            };
        }
        if (!this.itemIndexSetter) {
            const finalItemIndexField = itemIndexField || 'index';
            this.itemIndexSetter = (item, index) => {
                if (itemNeedIndex) {
                    if (item[finalItemIndexField] === undefined) {
                        (item as any).$vlIndex = index;
                        this.itemIndex[(this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item)] = index;
                        return;
                    }
                    (item as any).$vlIndex = index;
                    if (typeof itemIndexForceReplace === 'function') {
                        const needForce = itemIndexForceReplace(item, index);
                        if (needForce) {
                            item[finalItemIndexField] = index;
                        }
                        this.itemIndex[(this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item)] =
                            item[finalItemIndexField];
                        return;
                    }
                    if (itemIndexForceReplace) {
                        item[finalItemIndexField] = index;
                    }
                    this.itemIndex[(this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item)] =
                        item[finalItemIndexField];
                }
            };
        }
    }
    abstract getItemOffsetSizeByKey(keyOrItemSelf: string | number | T): number;
    abstract getItemOffsetSizeByIndex(indexOrItemSelf: number | T): number;
    protected abstract getTotalSize(): number;
    protected abstract computeRange(): VirtualListRange;
}
