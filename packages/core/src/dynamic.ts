import { BaseVirtualList } from './base';
import type { DynamicSizeVirtualListConfig, VirtualListRange } from '@cross-virtual-list/types';

export class DynamicSizeVirtualList<T = any> extends BaseVirtualList<T> {
    declare config: DynamicSizeVirtualListConfig;
    private itemReadySize: Record<number, number> = {};
    private itemSizeReadyCount = 0;
    private itemReadyTotalSize = 0;
    private itemSizeSum: number[] = [];
    /** 预计的后置缓冲区列表项数量 */
    private expectEndBufferCount = 0;
    /** 预计的前置缓冲区列表项数量 */
    private expectStartBufferCount = 0;
    private expectViewportShowCount = 0;

    constructor(config: DynamicSizeVirtualListConfig) {
        super(config);
        this.setConfig(config);
    }

    setConfig(config: Partial<DynamicSizeVirtualListConfig>, merge = true) {
        super.setConfig(config, merge);
        this.computeDynamicTotalSize();
        this.expectStartBufferCount = this.expectEndBufferCount = this.expectViewportShowCount = 0;

        this.expectViewportShowCount =
            this.config.viewportSize <= 0 || this.config.itemMinSize <= 0
                ? 0
                : Math.ceil(this.config.viewportSize / this.config.itemMinSize);

        if (typeof this.config.startBufferCount === 'number') {
            this.expectStartBufferCount = this.config.startBufferCount;
        } else {
            this.expectStartBufferCount =
                this.expectViewportShowCount <= 0 ? 0 : Math.ceil(this.expectViewportShowCount / 2);
        }

        if (typeof this.config.endBufferCount === 'number') {
            this.expectEndBufferCount = this.config.endBufferCount;
        } else {
            this.expectEndBufferCount =
                this.expectViewportShowCount <= 0 ? 0 : Math.ceil(this.expectViewportShowCount / 2);
        }
    }

    clear(fireCompute = true) {
        super.clear(fireCompute);
        this.itemSizeReadyCount = this.itemReadyTotalSize = 0;
        this.itemReadySize = {};
        this.itemSizeSum = [];
        this.expectStartBufferCount = this.expectEndBufferCount = this.expectViewportShowCount = 0;
        this.setConfig(this.config);
    }

    setList(list: T[]) {
        this.clear(false);
        super.setList(list);
    }

    checkItemSizeReady(itemIndex: number) {
        return itemIndex in this.itemReadySize;
    }

    setItemSizeByKey(itemKey: string | number | T, size: number, fireCompute = true) {
        const targetItem = this.findItemByKey(itemKey);
        if (targetItem) {
            this.setItemSizeByIndex(targetItem[1], size, fireCompute);
        }
    }
    setItemSizeByIndex(itemIndex: number, size: number, fireCompute = true) {
        if (!(itemIndex in this.itemReadySize)) {
            this.itemReadySize[itemIndex] = size;
            this.itemSizeReadyCount++;
            this.itemReadyTotalSize += size;
        } else {
            const oldSize = this.itemReadySize[itemIndex];
            this.itemReadySize[itemIndex] = size;
            this.itemReadyTotalSize -= oldSize;
            this.itemReadyTotalSize += size;
        }
        this.computeDynamicTotalSize();
        if (fireCompute) {
            this.computeItemSizeSum(itemIndex);
            this.compute();
        }
    }

    getItemOffsetSizeByIndex(index: number) {
        if (!index) {
            return 0;
        }
        this.computeItemSizeSum(0, index);
        return !index ? 0 : this.itemSizeSum[index] - this.getItemSize(index);
    }

    removeItemByIndex(index: number, fireCompute = true) {
        if (index in this.itemReadySize) {
            const oldSize = this.itemReadySize[index];
            delete this.itemReadySize[index];
            this.itemReadyTotalSize -= oldSize;
            this.itemSizeReadyCount--;
            this.computeDynamicTotalSize();
        }
        fireCompute && this.computeItemSizeSum(index - 1 > 0 ? 0 : index);
        super.removeItemByIndex(index, fireCompute);
    }
    removeItemByKey(key: string | number | T, fireCompute = true) {
        const [, index] = this.findItemByKey(key) || [];
        if (typeof index === 'number') {
            this.removeItemByIndex(index, fireCompute);
        }
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

    private getItemSize(index: number): number {
        return this.itemReadySize[index] || this.config.itemMinSize;
    }

    /** 计算视口显示列表项索引范围 */
    private computeShowRange() {
        const { nowScrollStartSize } = this;
        if (nowScrollStartSize < this.config.itemMinSize) {
            return [0, Math.min(this.expectViewportShowCount - 1, this.allList.length - 1)];
        }

        const possibleStartIndex = Math.min(
            Math.ceil(nowScrollStartSize / this.config.itemMinSize),
            this.allList.length - 1
        );
        this.computeItemSizeSum(possibleStartIndex, possibleStartIndex + this.expectViewportShowCount);
        let showListBeginIndex = possibleStartIndex;
        if (showListBeginIndex > 0) {
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
        }

        const { viewportSize } = this.config;
        let readySize = 0;
        let showListEndIndex = showListBeginIndex;
        while (true) {
            readySize += this.getItemSize(showListEndIndex);
            if (readySize >= viewportSize) {
                break;
            }
            showListEndIndex++;
        }
        return [
            showListBeginIndex,
            Math.min(
                showListEndIndex === showListBeginIndex
                    ? showListBeginIndex + this.expectViewportShowCount - 1
                    : showListEndIndex,
                this.allList.length - 1
            )
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
            const itemSize = this.getItemSize(startBufferBeginIndex);
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
            Math.min(
                readyStartBufferCount === 1
                    ? startBufferBeginIndex
                    : startBufferBeginIndex + (readyStartBufferCount - 1),
                this.allList.length - 1
            ),
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
        return [showListEndIndex + 1, Math.min(endIndex, maxIndex)];
    }

    private computeItemSizeSum(startIndex?: number, stopIndex?: number) {
        if (!this.allList.length) {
            return;
        }
        startIndex = startIndex === undefined ? 0 : startIndex;
        startIndex = Math.min(startIndex, this.allList.length - 1);
        stopIndex = stopIndex === undefined ? this.allList.length - 1 : stopIndex;
        stopIndex = Math.min(stopIndex, this.allList.length - 1);
        for (let i = startIndex; i <= stopIndex; i++) {
            const currentSize = this.getItemSize(i);
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

    private computeDynamicTotalSize() {
        return this.itemReadyTotalSize + (this.allList.length - this.itemSizeReadyCount) * this.config.itemMinSize;
    }
}
