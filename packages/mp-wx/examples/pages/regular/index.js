Page({
    data: {
        demoList: [
            {
                scroll: 'x',
                boxSize: 180
            },
            {
                scroll: 'y',
                boxSize: 180
            }
        ]
    },
    changeBoxSize(e) {
        this.setData({
            [`demoList[${e.currentTarget.dataset.index}].boxSize`]: e.detail.value
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
