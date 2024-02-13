const _random = Math.random;
const _floor = Math.floor;
const validateArg = (min, max, needInt = false) => {
    if (typeof max === 'undefined') {
        max = typeof min === 'undefined' ? 1 : min;
        min = 0;
    }
    min = min || 0;
    return {
        _min: needInt ? _floor(min) : min,
        _max: needInt ? _floor(max) : max
    };
};

/** 随机产生一个整数 */
const randomInt = (min, max) => {
    const { _min, _max } = validateArg(min, max, true);
    return _floor(_random() * (_max - _min + 1) + _min);
};
Page({
    data: {
        demoList: [
            {
                scroll: 'x',
                boxSize: 180,
                boxSizeSource: 180
            },
            {
                scroll: 'y',
                boxSize: 180,
                boxSizeSource: 180
            }
        ]
    },
    changeBoxSize(e) {
        this.setData({
            [`demoList[${e.currentTarget.dataset.index}].boxSizeSource`]: e.detail.value
        });
    },
    confirmBoxSize(e) {
        this.setData({
            [`demoList[${e.currentTarget.dataset.index}].boxSize`]:
                this.data.demoList[e.currentTarget.dataset.index].boxSizeSource
        });
    },
    onVlReady(e) {
        console.log('onVlReady=', e);
        const indexSize = [];
        e.detail.setList(
            Array.from({
                length: 2000
            }).map((item, index) => {
                indexSize[index] = randomInt(51, 80);
                return {
                    name: Date.now(),
                    size: indexSize[index]
                };
            })
        );
        // indexSize.forEach((size, index) => {
        //     e.detail.setItemSizeByIndex(index, size);
        // });
    }
});
