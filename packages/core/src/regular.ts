/**
 *
 * 容器：所有列表项撑起的总高度；
 * 可视区域：固定高度古尔邦节列表项高度显示多个列表项；
 * 前置缓冲区：
 * 后置缓冲区：
 */

import { BaseVirtualList } from './base';
import type { RegularSizeVirtualListConfig, VirtualListRange } from '@cross-virtual-list/types';

export class RegularSizeVirtualList<T extends object = any> extends BaseVirtualList<T, RegularSizeVirtualListConfig> {
    /** 预计的后置缓冲区列表项数量 */
    private expectEndBufferCount = 0;
    /** 预计的前置缓冲区列表项数量 */
    private expectStartBufferCount = 0;
    private viewportShowListCount = 0;

    constructor(config: RegularSizeVirtualListConfig<T>) {
        super(config);
        this.setConfig(config);
    }

    clear(fireCompute = true): void {
        super.clear(fireCompute);
        this.expectStartBufferCount = this.expectEndBufferCount = this.viewportShowListCount = 0;
        this.setConfig(this.config);
    }

    setConfig(config: Partial<RegularSizeVirtualListConfig<T>>, merge = true): void {
        super.setConfig(config, merge);
        this.expectStartBufferCount = this.expectEndBufferCount = this.viewportShowListCount = 0;
        this.viewportShowListCount = Math.ceil(this.config.viewportSize / this.config.itemSize);
        if (typeof this.config.startBufferCount === 'number') {
            this.expectStartBufferCount = this.config.startBufferCount;
        } else {
            this.expectStartBufferCount = Math.ceil(this.viewportShowListCount / 2);
        }

        if (typeof this.config.endBufferCount === 'number') {
            this.expectEndBufferCount = this.config.endBufferCount;
        } else {
            this.expectEndBufferCount = Math.ceil(this.viewportShowListCount / 2);
        }
    }

    getItemOffsetSizeByKey(keyOrItemSelf: string | number | T) {
        const [, index] = this.findItemByKey(keyOrItemSelf) || [];
        if (index === undefined) {
            return 0;
        }
        return this.config.itemSize * index;
    }

    getItemOffsetSizeByIndex(indexOrItemSelf: number | T) {
        if (typeof indexOrItemSelf === 'number') {
            return this.config.itemSize * indexOrItemSelf;
        }
        const [, index] = this.findItemByKey(indexOrItemSelf) || [];
        if (index === undefined) {
            return 0;
        }
        return this.config.itemSize * index;
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
            endBufferBeginIndex,
            endBufferEndIndex
        };
    }

    protected getTotalSize(): number {
        return this.allList.length * this.config.itemSize;
    }

    /** 计算视口显示列表项索引范围 */
    private computeShowRange() {
        const itemSize = this.config.itemSize;
        const { nowScrollStartSize } = this;
        const startIndex = Math.max(Math.floor(nowScrollStartSize / itemSize), 0);
        const endIndex = Math.min(startIndex + (this.viewportShowListCount - 1), this.allList.length - 1);
        return [startIndex, endIndex];
    }

    /** 计算前置缓冲区列表项索引范围 */
    private computeStartBufferRange(showListBeginIndex: number) {
        const { nowScrollStartSize, expectStartBufferCount } = this;
        if (showListBeginIndex <= 0) {
            return [-1, -1];
        }
        const itemSize = this.config.itemSize;
        if (nowScrollStartSize < itemSize || !expectStartBufferCount) {
            return [-1, -1];
        }
        let startBufferBeginIndex = showListBeginIndex;
        let readyStartBufferCount = 0;
        let residualScrollStartSize = nowScrollStartSize;

        while (true) {
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
            readyStartBufferCount === 1 ? startBufferBeginIndex : startBufferBeginIndex + (readyStartBufferCount - 1)
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
}
