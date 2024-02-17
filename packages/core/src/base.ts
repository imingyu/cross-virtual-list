/**
 *
 * 容器：所有列表项撑起的总高度；
 * 可视区域：固定高度古尔邦节列表项高度显示多个列表项；
 * 前置缓冲区：
 * 后置缓冲区：
 */

import type {
    VirtualItemKeyFieldComputer,
    BaseVirtualListConfig,
    VirtualListRange,
    VirtualListScrollStartSizeChangeEvent,
    VirtualItem
} from '@cross-virtual-list/types';
import { each } from './util';

export abstract class BaseVirtualList<T = any> {
    config: BaseVirtualListConfig;
    oldScrollStartSize = 0;
    nowScrollStartSize = 0;
    allList: Array<T> = [];
    protected totalSize = 0;
    protected startBufferBeginIndex = -1;
    protected startBufferEndIndex = -1;
    protected endBufferBeginIndex = -1;
    protected endBufferEndIndex = -1;
    protected showListBeginIndex = -1;
    protected showListEndIndex = -1;
    protected itemKeyComputer?: VirtualItemKeyFieldComputer<T>;
    protected keyMark: Record<string, 1> = {};
    protected uuid = 0;
    protected cacheSafe = false;
    protected itemMapKey = new Map<T, any>();
    protected keyMapIndex: Record<string | number, number> = {};
    protected indexMapKey: Array<string | number> = [];

    constructor(config: BaseVirtualListConfig) {
        this.setConfig(config);
    }

    setConfig(config: Partial<BaseVirtualListConfig>, merge = true) {
        const oldItemKeyField = JSON.stringify(this.config?.itemKeyField);
        if (!merge) {
            this.config = config as BaseVirtualListConfig;
        } else if (!this.config) {
            this.config = config as BaseVirtualListConfig;
        } else {
            Object.assign(this.config, config);
        }
        const newItemKeyField = JSON.stringify(this.config.itemKeyField);
        if (newItemKeyField !== oldItemKeyField || !this.itemKeyComputer) {
            this.itemMapKey = new Map();
            this.keyMapIndex = {};
            this.indexMapKey = [];

            delete this.itemKeyComputer;
            const { itemKeyField } = this.config;
            let finalItemKeyField = itemKeyField || 'id';
            let keyFieldIsArr = false;
            if (Array.isArray(finalItemKeyField)) {
                if (finalItemKeyField.length === 1) {
                    finalItemKeyField = finalItemKeyField[0];
                } else {
                    keyFieldIsArr = true;
                }
            }
            if (typeof finalItemKeyField === 'string') {
                this.cacheSafe = !!finalItemKeyField;
            } else if (Array.isArray(finalItemKeyField)) {
                this.cacheSafe = !!finalItemKeyField.length;
            } else {
                this.cacheSafe = false;
            }
            this.itemKeyComputer = (item: T): any => {
                if (typeof item === 'object' && item) {
                    if (keyFieldIsArr) {
                        return (finalItemKeyField as string[]).reduce((sum, k) => {
                            return sum + (typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k]);
                        }, '');
                    }
                    return item[finalItemKeyField as string];
                }
                return item;
            };
        }
    }

    setList(list: T[]) {
        this.clear(false);
        this.allList = list.concat([]);
        this.compute();
    }

    appendItem(item: T, fireCompute = true) {
        if (this.cacheSafe && typeof item === 'object') {
            this.setItemCache(item, (this.itemKeyComputer as VirtualItemKeyFieldComputer)(item), this.allList.length);
        }
        this.allList.push(item);
        fireCompute && this.compute();
    }
    appendItems(items: T[], fireCompute = true) {
        if (this.cacheSafe && typeof items[0] === 'object') {
            const len = this.allList.length;
            items.forEach((item, i) => {
                this.setItemCache(item, (this.itemKeyComputer as VirtualItemKeyFieldComputer)(item), len + i);
                this.allList.push(item);
            });
        } else {
            // eslint-disable-next-line prefer-spread
            this.allList.push.apply(this.allList, items);
        }

        fireCompute && this.compute();
    }

    replaceItemByKey(key: string | number | T, replacement: T | ((target: T) => void), fireCompute = true): boolean {
        const targetItem = this.findItemByKey(key);
        if (!targetItem) {
            return false;
        }
        if (typeof replacement === 'function') {
            (replacement as (target: T) => void)(targetItem[0]);
        } else {
            this.allList[targetItem[1]] = replacement;
        }
        fireCompute && this.compute();
        return true;
    }

    clear(fireCompute = true) {
        this.allList = [];
        this.keyMark = {};
        this.itemMapKey = new Map();
        this.keyMapIndex = {};
        this.indexMapKey = [];
        this.cacheSafe = false;
        this.totalSize = 0;
        this.uuid = 0;
        this.showListBeginIndex =
            this.showListEndIndex =
            this.startBufferBeginIndex =
            this.startBufferEndIndex =
            this.endBufferBeginIndex =
            this.endBufferEndIndex =
                -1;
        this.nowScrollStartSize = this.oldScrollStartSize = 0;
        fireCompute && this.compute();
    }

    getShowList() {
        return this.sliceList(this.showListBeginIndex, this.showListEndIndex, 'show');
    }

    getStartBufferList() {
        return this.sliceList(this.startBufferBeginIndex, this.startBufferEndIndex, 'startBuffer');
    }

    getEndBufferList() {
        return this.sliceList(this.endBufferBeginIndex, this.endBufferEndIndex, 'endBuffer');
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

    findItemByKey(key: string | number | T): [T, number] | undefined {
        let targetKey;
        if (typeof key === 'object') {
            if (!key) {
                return;
            }
            targetKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(key);
        } else {
            targetKey = key;
        }
        if (this.cacheSafe && targetKey in this.keyMapIndex) {
            return [this.allList[this.keyMapIndex[targetKey]], this.keyMapIndex[targetKey]];
        }
        let res: [T, number] | undefined;
        each(this.allList, (item, index) => {
            if (key === item) {
                const sk = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item);
                res = [item, index];
                this.cacheSafe && typeof item === 'object' && this.setItemCache(item, sk, index);
                return false;
            }
            const currentKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item);
            this.cacheSafe && typeof item === 'object' && this.setItemCache(item, currentKey, index);
            if (currentKey === targetKey) {
                res = [item, index];
                return false;
            }
        });
        return res;
    }

    removeItemByIndex(index: number, fireCompute = true) {
        if (!(index in this.allList)) {
            return;
        }
        const [item] = this.allList.splice(index, 1);
        if (this.cacheSafe && typeof item === 'object') {
            this.itemMapKey.delete(item);
            const itemKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer)(item);
            delete this.keyMapIndex[itemKey];
            this.indexMapKey.splice(index);
        }
        fireCompute && this.compute();
    }
    removeItemByKey(key: string | number | T, fireCompute = true) {
        const [, index] = this.findItemByKey(key) || [];
        if (typeof index === 'number') {
            this.removeItemByIndex(index);
            fireCompute && this.compute();
        }
    }

    private setItemCache(item: T, key: string | number, index: number) {
        this.itemMapKey.set(item, key);
        this.keyMapIndex[key] = index;
        this.indexMapKey[index] = key;
    }

    private sliceList(
        startIndex: number,
        endIndex: number,
        scope: 'startBuffer' | 'show' | 'endBuffer'
    ): Array<VirtualItem<T>> {
        if (startIndex === -1) {
            return [];
        }
        const res: Array<VirtualItem<T>> = [];
        for (let i = startIndex; i <= endIndex; i++) {
            res.push({
                item: this.allList[i],
                index: i,
                maxIndex: this.allList.length - 1,
                key: this.fillKey(this.allList[i], i),
                offset: this.getItemOffsetSizeByIndex(i),
                scope
            });
        }
        return res;
    }
    private fillKey(item: T, index: number): string {
        let key = '';
        if (typeof item === 'object' && item) {
            key = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item);
            key = key === undefined ? String(index) : String(key);
        } else {
            key = String(index);
        }
        return key;
    }

    abstract getItemOffsetSizeByIndex(index: number): number;
    protected abstract getTotalSize(): number;
    protected abstract computeRange(): VirtualListRange;
}
