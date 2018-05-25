console.clear();
App({

  globalData: {
    version: "MultiNote X1.9.0", //版本号
    current: wx.getStorageSync("bgiCurrent") || 0, //当前背景图序号
    bgiQueue: [ //背景图地址队列
      "../images/bgi1.jpg",
      "../images/bgi2.jpg",
      "../images/bgi3.jpg",
      "../images/bgi4.jpg",
      "../images/bgi5.gif",
    ]
  },

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch(res) {
    console.log("MultiNote onLaunch");
    if (wx.getStorageInfoSync().keys.indexOf("note") === -1) wx.setStorageSync("note", []);
    if (wx.getStorageInfoSync().keys.indexOf("bgiCurrent") === -1) wx.setStorageSync("bgiCurrent", 0);
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow(res) {
    console.log("MultiNote onShow");
  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide(res) {
    console.log("MultiNote onHide");
  },

  onUnload(res) {
    console.log("MultiNote onUnload");
  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError(msg) {
    console.log("MultiNote onError", msg);
  }
});
