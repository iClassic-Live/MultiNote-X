//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

/* 页面构造器：页面功能初始化 */

  Page({

      data: {
        //应用版本号显示
        version: getApp().globalData.version,

        //背景图切换功能初始化
        duration: 0, //背景图滑块切换的过渡时间
        current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
        bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列
      },

    /* 页面默认功能 */

      /* 生命周期函数--监听页面加载 */
      onLoad (res) {
        console.log("Home onLoad");
        this.data = require("../api/deepProxy.js").rendering(this);
        var bgiCurrent = wx.getStorageSync("bgiCurrent");
        if (this.data.current !== bgiCurrent) this.data.current = bgiCurrent;
      },

      /* 生命周期函数--监听页面显示 */
      onShow (res){
        console.log("Home onShow");
        var bgiCurrent = wx.getStorageSync("bgiCurrent");
        if (this.data.current === bgiCurrent) {
          if (this.data.current !== 500) this.data.duration = 500;
        } else this.data.current = bgiCurrent;
      },

      /* 生命周期函数--监听页面初次渲染完成 */
      onReady (res) {
        console.log("Home onReady");
        if (this.data.current !== 500) this.data.duration = 500;
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