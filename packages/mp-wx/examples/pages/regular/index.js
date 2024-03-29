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
        e.detail.setList(
            Array.from({
                length: 2000
            }).map(() => {
                return {
                    name: Date.now()
                };
            })
        );
    }
});
