Page({
    copy(e) {
        wx.setClipboardData({
            data: e.currentTarget.dataset.url
        });
    }
});
