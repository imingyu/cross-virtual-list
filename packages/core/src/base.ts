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
    private uuid = 0;

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
        this.allList.push(item);
        fireCompute && this.compute();
    }
    appendItems(items: T[], fireCompute = true) {
        // eslint-disable-next-line prefer-spread
        this.allList.push.apply(this.allList, items);
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
        this.totalSize = 0;
        this.uuid = 0;
        this.showListBeginIndex =
            this.showListEndIndex =
            this.startBufferBeginIndex =
            this.startBufferEndIndex =
            this.endBufferBeginIndex =
            this.endBufferEndIndex =
                -1;
        fireCompute && this.compute();
    }

    getShowList() {
        return this.sliceList(this.showListBeginIndex, this.showListEndIndex);
    }

    getStartBufferList() {
        return this.sliceList(this.startBufferBeginIndex, this.startBufferEndIndex);
    }

    getEndBufferList() {
        return this.sliceList(this.endBufferBeginIndex, this.endBufferEndIndex);
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

    protected findItemByKey(key: string | number | T): [T, number] | undefined {
        let targetKey;
        if (typeof key === 'object') {
            if (!key) {
                return;
            }
            targetKey = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(key);
        } else {
            targetKey = key;
        }
        let res;
        each(this.allList, (item, index) => {
            if (key === item) {
                res = [item, index];
                return false;
            }
            if ((this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item) === targetKey) {
                res = [item, index];
                return false;
            }
        });
        return res;
    }

    private sliceList(startIndex: number, endIndex: number): Array<VirtualItem> {
        if (startIndex === -1) {
            return [];
        }
        const res: Array<VirtualItem> = [];
        for (let i = startIndex; i <= endIndex; i++) {
            res.push({
                item: this.allList[i],
                index: i,
                key: this.uniqueKey(this.allList[i], i),
                offset: this.getItemOffsetSizeByIndex(i)
            });
        }
        return res;
    }
    private uniqueKey(item: T, index: number): string {
        let key = '';
        if (typeof item === 'object' && item) {
            key = (this.itemKeyComputer as VirtualItemKeyFieldComputer<T>)(item);
            key = key === undefined ? String(index) : String(key);
        } else {
            key = String(index);
        }

        while (true) {
            if (!(key in this.keyMark)) {
                return key;
            }
            key += String(this.uuid++);
        }
        return key;
    }

    abstract getItemOffsetSizeByIndex(indexOrItemSelf: number): number;
    protected abstract getTotalSize(): number;
    protected abstract computeRange(): VirtualListRange;
}
