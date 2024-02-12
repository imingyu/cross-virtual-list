import { BaseVirtualList } from './base';
import type { DynamicSizeVirtualListConfig, VirtualListRange } from '@cross-virtual-list/types';

export class DynamicSizeVirtualList<T extends object = any> extends BaseVirtualList<
    T,
    DynamicSizeVirtualListConfig<T>
> {
    private dynamicTotalSize = 0;
    private itemDynamicSize: Record<number, number> = {};
    private itemSizeReadyIndex: Record<number, 1> = {};
    private itemSizeReadyCount = 0;
    private totalReadyItemSize = 0;
    private itemSizeSum: number[] = [];
    /** 预计的后置缓冲区列表项数量 */
    private expectEndBufferCount = 0;
    /** 预计的前置缓冲区列表项数量 */
    private expectStartBufferCount = 0;
    private expectViewportShowCount = 0;

    constructor(config) {
        super(config);
        this.setConfig(config);
    }

    append(...items: (T | T[])[]) {
        super.append(...items);
        this.computeDynamicTotalSize();
    }

    setConfig(config: Partial<DynamicSizeVirtualListConfig<T>>, merge = true) {
        super.setConfig(config, merge);
        this.computeDynamicTotalSize();
        this.expectStartBufferCount = this.expectEndBufferCount = this.expectViewportShowCount = 0;

        this.expectViewportShowCount = Math.ceil(this.config.viewportSize / this.config.itemMinSize);

        if (typeof this.config.startBufferCount === 'number') {
            this.expectStartBufferCount = this.config.startBufferCount;
        } else {
            this.expectStartBufferCount = Math.ceil(this.expectViewportShowCount / 2);
        }

        if (typeof this.config.endBufferCount === 'number') {
            this.expectEndBufferCount = this.config.endBufferCount;
        } else {
            this.expectEndBufferCount = Math.ceil(this.expectViewportShowCount / 2);
        }
    }

    clear(fireCompute = true) {
        super.clear(fireCompute);
        this.itemSizeReadyCount = this.totalReadyItemSize = this.dynamicTotalSize = 0;
        this.itemSizeReadyIndex = {};
        this.itemDynamicSize = {};
        this.itemSizeSum = [];
        this.expectStartBufferCount = this.expectEndBufferCount = this.expectViewportShowCount = 0;
        this.setConfig(this.config);
    }

    setList(list: T[]) {
        this.clear(false);
        super.setList(list);
    }

    setItemSizeByKey(itemKey: string | number | T, size: number, fireCompute = true) {
        const targetItem = this.findItemByKey(itemKey);
        if (targetItem) {
            this.setItemSizeByIndex(targetItem[1], size, fireCompute);
        }
    }
    setItemSizeByIndex(itemIndex: number, size: number, fireCompute = true) {
        this.itemDynamicSize[itemIndex] = size;
        if (!(itemIndex in this.itemSizeReadyIndex)) {
            this.itemSizeReadyIndex[itemIndex] = 1;
            this.itemDynamicSize[itemIndex] = size;
            this.itemSizeReadyCount++;
            this.totalReadyItemSize += size;
        }
        if (fireCompute) {
            this.computeItemSizeSum(itemIndex);
            this.compute();
        }
    }

    getItemSize(item: T, index: number): number {
        return this.itemDynamicSize[index] || this.config.itemMinSize;
    }

    getItemOffsetSizeByKey(keyOrItemSelf: string | number | T) {
        const [, index] = this.findItemByKey(keyOrItemSelf) || [];
        return this.getItemOffsetByIndex(index);
    }

    getItemOffsetSizeByIndex(indexOrItemSelf: number | T) {
        if (typeof indexOrItemSelf === 'number') {
            return this.getItemOffsetByIndex(indexOrItemSelf);
        }
        return this.getItemOffsetSizeByKey(indexOrItemSelf);
    }

    protected getTotalSize(): number {
        return this.computeDynamicTotalSize();
    }

    protected computeRange(): VirtualListRange {
        // 计算并设置视口显示列表索引范围
        const [showListBeginIndex, showListEndIndex] = this.computeShowRange();
        // 计算并设置前置缓冲区列表索引范围，以及前置空白滚动区域尺寸
        const [startBufferBeginIndex, startBufferEndIndex] = this.computeStartBufferRange(showListBeginIndex);
        const [endBufferBeginIndex, endBufferEndIndex] = this.computeEndBufferRange(showListEndIndex);
        return {
            showListBeginIndex,
            showListEndIndex,
            startBufferBeginIndex,
            startBufferEndIndex,
            endBufferEndIndex,
            endBufferBeginIndex
        };
    }

    private getItemOffsetByIndex(index?: number) {
        if (!index) {
            return 0;
        }
        this.computeItemSizeSum(0, index);
        return !index ? 0 : this.itemSizeSum[index] - this.getItemSize(this.allList[index], index);
    }

    /** 计算视口显示列表项索引范围 */
    private computeShowRange() {
        const { nowScrollStartSize } = this;
        if (nowScrollStartSize < this.config.itemMinSize) {
            return [0, this.expectViewportShowCount - 1];
        }

        const possibleStartIndex = Math.ceil(nowScrollStartSize / this.config.itemMinSize);
        this.computeItemSizeSum(possibleStartIndex, possibleStartIndex + this.expectViewportShowCount);
        let showListBeginIndex = possibleStartIndex;
        if (this.itemSizeSum[showListBeginIndex] < nowScrollStartSize) {
            for (let i = possibleStartIndex; i >= 0; i--) {
                if (nowScrollStartSize >= this.itemSizeSum[i]) {
                    showListBeginIndex = i;
                    break;
                }
            }
        } else {
            while (true) {
                showListBeginIndex--;
                if (this.itemSizeSum[showListBeginIndex] < nowScrollStartSize || showListBeginIndex <= 0) {
                    break;
                }
            }
        }

        const { viewportSize } = this.config;
        let readySize = 0;
        let showListEndIndex = showListBeginIndex;
        while (true) {
            readySize += this.getItemSize(this.allList[showListEndIndex], showListEndIndex);
            if (readySize >= viewportSize) {
                break;
            }
            showListEndIndex++;
        }
        return [
            showListBeginIndex,
            showListEndIndex === showListBeginIndex
                ? showListBeginIndex + this.expectViewportShowCount - 1
                : showListEndIndex
        ];
    }

    /** 计算前置缓冲区列表项索引范围，同时计算前置空白滚动区域尺寸 */
    private computeStartBufferRange(showListBeginIndex: number) {
        const { nowScrollStartSize, expectStartBufferCount } = this;
        if (showListBeginIndex <= 0) {
            return [-1, -1, nowScrollStartSize, 0];
        }
        const itemMinSize = this.config.itemMinSize;
        if (nowScrollStartSize < itemMinSize || !expectStartBufferCount || expectStartBufferCount === -1) {
            return [-1, -1, nowScrollStartSize, 0];
        }
        let startBufferBeginIndex = showListBeginIndex;
        let readyStartBufferCount = 0;
        let residualScrollStartSize = nowScrollStartSize;
        let readyStartBufferSize = 0;

        while (true) {
            const itemSize = this.getItemSize(this.allList[startBufferBeginIndex], startBufferBeginIndex);
            readyStartBufferSize += itemSize;
            startBufferBeginIndex--;
            readyStartBufferCount++;
            residualScrollStartSize -= itemSize;
            if (
                startBufferBeginIndex <= 0 ||
                residualScrollStartSize <= 0 ||
                readyStartBufferCount >= expectStartBufferCount
            ) {
                break;
            }
        }
        return [
            startBufferBeginIndex,
            readyStartBufferCount === 1 ? startBufferBeginIndex : startBufferBeginIndex + (readyStartBufferCount - 1),
            residualScrollStartSize,
            readyStartBufferSize
        ];
    }

    /** 计算后置缓冲区列表项索引范围 */
    private computeEndBufferRange(showListEndIndex: number) {
        const maxIndex = this.allList.length - 1;
        const { expectEndBufferCount } = this;
        if (!expectEndBufferCount || showListEndIndex <= 0 || showListEndIndex + 1 > maxIndex) {
            return [-1, -1];
        }
        const endIndex = showListEndIndex + 1 + expectEndBufferCount;
        return [showListEndIndex + 1, endIndex >= maxIndex ? maxIndex : endIndex];
    }

    private computeItemSizeSum(startIndex?: number, stopIndex?: number) {
        startIndex = startIndex === undefined ? 0 : startIndex;
        stopIndex = stopIndex === undefined ? this.allList.length - 1 : stopIndex;
        for (let i = startIndex; i <= stopIndex; i++) {
            const item = this.allList[i];
            const currentSize = this.getItemSize(item, i);
            let beforeSize;
            if (i === 0) {
                beforeSize = 0;
            } else {
                beforeSize = this.itemSizeSum[i - 1];
                if (beforeSize === undefined) {
                    this.computeItemSizeSum(0, i - 1);
                }
                beforeSize = this.itemSizeSum[i - 1];
            }
            this.itemSizeSum[i] = beforeSize + currentSize;
        }
    }

    private computeScrollInsideRange() {
        const { nowScrollStartSize } = this;
        if (nowScrollStartSize <= 0) {
            return [0, this.expectViewportShowCount - 1];
        }

        // 使用二分查找，结合最小尺寸找到离滚动值所处的大致列表索引区间
        const insideRange: [number, number] = [0, Math.ceil(this.allList.length / 2)];
        const totalSize = this.getTotalSize();
        let currentHalfSize = totalSize / 2;
        let currentHalfIsGreater = currentHalfSize > nowScrollStartSize; // 当前的二分索引计算出的高度是否大于滚动值
        while (true) {
            if (currentHalfIsGreater) {
                // 向前继续二分
                insideRange[0] = insideRange[1];
                insideRange[1] = Math.ceil(insideRange[1] / 2);
                currentHalfSize = currentHalfSize / 2;
                currentHalfIsGreater = currentHalfSize > nowScrollStartSize;
                if (!currentHalfIsGreater) {
                    break;
                }
                continue;
            }
            // 向后继续二分
            insideRange[0] = insideRange[1];
            insideRange[1] += Math.ceil(insideRange[1] / 2);
            currentHalfSize += currentHalfSize / 2;
            currentHalfIsGreater = currentHalfSize > nowScrollStartSize;
            if (currentHalfIsGreater) {
                break;
            }
        }
        return insideRange.sort((a, b) => a - b);
    }

    private computeDynamicTotalSize() {
        if (this.allList.length && !this.dynamicTotalSize) {
            this.dynamicTotalSize = this.allList.length * this.config.itemMinSize;
            return this.dynamicTotalSize;
        }
        this.dynamicTotalSize =
            this.totalReadyItemSize + (this.allList.length - this.itemSizeReadyCount) * this.config.itemMinSize;
        return this.dynamicTotalSize;
    }
}
