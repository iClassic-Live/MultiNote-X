//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

/* 页面构造器：页面功能初始化 */

  Page({

      data: {
        //应用版本号显示
        version: getApp().globalData.version,
      },

    /* 页面默认功能 */

      /* 生命周期函数--监听页面加载 */
      onLoad (res) {
        console.log("Home onLoad");
        this.data = require("../api/deepProxy.js").rendering.call(this);
        this.data.backgroundImage = getApp().globalData.bgiQueue[wx.getStorageSync("bgiCurrent")];
      },

      /* 生命周期函数--监听页面显示 */
      onShow (res){
        console.log("Home onShow");
      },

      /* 生命周期函数--监听页面初次渲染完成 */
      onReady (res) {
        console.log("Home onReady");
      },

      /* 生命周期函数--监听页面卸载 */
      onUnload (res) {
        console.log("Home onUnload");
      },

    /* 自定义用户交互逻辑 */

      /* 开始使用 */
      //MultiNote开始使用按钮，当用户缓存中有记事时则跳转到读记事页，否则跳转到写记事页
      startUsing (res) {
        if (wx.getStorageSync("note").length > 0) {
          wx.showLoading({
            title: "正在进入读记事",
            mask: true
          });
          wx.redirectTo({ url: "../ShowNote/ShowNote" });
        } else {
          wx.showLoading({
            title: "正在进入写记事",
            mask: true
          });
          wx.redirectTo({ url: "../CreateNote/CreateNote" });
        }
      }

  });