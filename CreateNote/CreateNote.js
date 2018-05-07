// CreateNote/CreateNote/CreateNote.js

/* 写记事页面初始化 */

//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//用于监测是否已开启相关权限的标识初始化
var getRecordAccess = true; //录音权限的标识，默认权限开启
var getCameraAccess = true; //相机权限的标识，默认权限开启
var getAlbumAccess = true; //存图到相册权限的标识，默认权限开启

//记录当前记事的全局载体
var item;

//语音记事初始化
const recorderManager = wx.getRecorderManager(); //获取全局唯一的录音管理器 recorderManager
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部audio上下文 innerAudioContext 对象
var interval, timerA, timerB, timerC; //承接定时器和计时器的的公用标识

//视频记事初始化
var shootTimer; //录像时长计时器的标识

/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */
  /* 页面的初始数据 */
  data: {

    //背景图切换功能初始化
    duration: 0, //背景图滑块切换的过渡时间
    current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
    bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列

    //功能区切换功能初始化，默认主功能区启动，其他功能区待命
    noting: "menu",
    ifPreview: false,

    //记事标题功能初始化
    titleDefault: "记事标题", //标题文本为空时的字样，默认为记事标题

    //文本记事功能初始化
    textDefault: "记事文本", //记事文本为空时的字样，默认为记事文本
    text: {}, //记事文本信息
    font: [["超小号", "小号", "默认", "大号", "超大号"], ["轻盈", "默认", "粗壮"], ["默认", "中国红", "罗兰紫", "深空蓝", "森林绿", "巧克力棕"]], //字体样式选择器相应选择项的提示序列

    //语音记事功能初始化
    playback: [], //语音记事播放缓存

    //图片记事功能初始化
    img: [], //图片记事预览缓存

    //视频记事功能初始化
    video: "", //视频记事预览缓存

    //相机组件功能初始化
    flash: "off", //闪光灯设置，默认关闭
    flashSet: "../images/notflash.png", //闪光灯标识设定
    shootSign: 0, //录像进行时闪动标识
    camSign: 1, //摄像头反转图标的透明度设置
    camChoice: "../images/backCam.png", //摄像头前后置的图标设定
    cameraSet: "../images/photo.png", //拍摄按钮标识设定
    changeMode: "../images/shoot.png", //拍摄类型切换标识设定
    shootNow: false, //录像进行时标识，录像未进行时为false
    qualitySet: "Normal" //照片质量设定，默认为普通

  },

  /* 生命周期函数--监听页面加载 */
  onLoad(options) {
    console.log("CreateNote onLoad");
    wx.hideLoading();
    this.data = require("../api/api.js").rendering(this);
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current !== bgiCurrent) this.data.current = bgiCurrent;
    wx.getSetting({  //获取录音功能、相机功能和保存到相册功能的权限获取情况
      success(res) { //若能或取权限获取情况
        function failure(prop) { //建立权限获取失败函数
          var content;
          switch (prop) {
            case "scope.record": {
              getRecordAccess = false;
              content = "未获取录音权限";
              break;
            };
            case "scope.camera": {
              getCameraAccess = false;
              content = "未获取相机权限";
              break;
            };
            case "scope.writePhotosAlbum": {
              getAlbumAccess = false;
              content = "将无法写入相册";
              break;
            };
          }
          wx.showToast({
            title: content,
            image: "../images/warning.png"
          });
        }
        if (Object.keys(res.authSetting).length === 3) { //若相应权限都曾要求授权
          for (let prop in res.authSetting) {
            if (!res.authSetting[prop]) { //若有相应权限没有授权
              wx.authorize({ //弹出相应权限的授权提示框
                scope: prop,
                fail(res) { //若授权失败
                  wx.openSetting({  //打开手机系统授权窗口进行授权
                    fail(res) { failure(prop) }  //若相应权限仍然无法授权则调取权限获取失败函数
                    }); 
                }
              });
            }
          }
        } else { //若有权限未曾提出授予
          var scopeQueue = ["scope.record", "scope.camera", "scope.writePhotosAlbum"];
          scopeQueue.forEach(ele => {
            if (ele in res.authSetting === false) {
              wx.authorize({  //弹出相应权限的授权提示框
                scope: ele,
                fail(res) {
                  wx.openSetting({  //打开手机系统授权窗口进行授权
                    fail(res) { failure(ele) }   //若相应权限仍然无法授权则调取权限获取失败函数
                  });
                }
              });
            }
          });
        }
      },
      fail(res) {  //若无法获取录音功能、相机功能和保存到相册功能的权限获取情况
        //限制相应功能或组件的使用
        getRecordAccess = false;
        getCameraAccess = false;
        getAlbumAccess = false;
        wx.showModal({  //弹出权限获取情况无法读取的警告窗口
          title: "写记事",
          content: "警告：无法读取权限获取信息，录音、相机和写入相册功能将不可用！",
          showCancel: false
        });
      }
    });
    //监测当前是修改记事还是新建记事，并相应地为接下来的记事存储做准备
    var note = wx.getStorageSync("note");
    if (wx.getStorageInfoSync().keys.indexOf("item_to_edit") !== -1) {
      var index = wx.getStorageSync("item_to_edit")
      item = note[index];
      console.log("修改前的记事存储情况如下：",
        "\n记事标题：", item.note.title,
        "\n记事文本：", item.note.text,
        "\n语音记事：", item.note.record,
        "\n图片记事：", item.note.photo,
        "\n视频记事：", item.note.video);
      console.log("用户开始修改记事");
    } else {
      console.log("用户开始新建记事");
      //初始化向写记事页发送数据的载体
      item = {
        id: note.length,
        note: {
          title: (() => {  //新记事的默认标题
            var dateFn = new Date();
            return ("记事 "
              + dateFn.getFullYear()
              + (dateFn.getMonth() + 1 < 10 ?
                "0" + (dateFn.getMonth() + 1) :
                dateFn.getMonth() + 1)
              + (dateFn.getDate() < 10 ?
                "0" + dateFn.getDate() : dateFn.getDate())
              + (dateFn.getHours() < 10 ?
                "0" + dateFn.getHours() : dateFn.getHours())
              + (dateFn.getMinutes() < 10 ?
                "0" + dateFn.getMinutes() : dateFn.getMinutes())
              + (dateFn.getSeconds() < 10 ?
                "0" + dateFn.getSeconds() : dateFn.getSeconds())
            );
          })(),
          text: {  //新记事的记事文本的默认内容
            content: "",
            fontSize: "100%",
            fontWeight: "normal",
            fontColor: "#000",
            fontIndex: [2, 1, 0]
          },
          record: [],
          photo: [],
          video: ""
        }
      }
      console.log("当前记事内容初始化情况如下：",
        "\n记事标题：", item.note.title,
        "\n记事文本：", item.note.text,
        "\n语音记事：", item.note.record,
        "\n图片记事：", item.note.photo,
        "\n视频记事：", item.note.video);
    }
    var note = JSON.parse(JSON.stringify(item.note));
    this.data.title = note.title;
    this.data.text = note.text;
    note.record.forEach((ele, index) => {
      ele.record_index = index,
      ele.opacity = 1;
    });
    this.data.playback = note.record;
    note.photo.forEach((ele, index) => {
      ele.photo_index = index;
    });
    this.data.img = note.photo;
    this.data.video = note.video;

    //预注册录音开始事件
    var that = this;
    recorderManager.onStart((res) => {
      if (that.tag) { //当录音开始进程偷跑时截停
        recorderManager.stop();
        recorderManager.onStop();
      } else { //当录音正常进行时录音
        that.recordNow = true;
        that.breathingEffection("start");
        that.progressBar("start");
        //注册录音结束事件
        recorderManager.onStop((res) => {
          delete that.recordNow;
          wx.hideToast();
          that.breathingEffection("stop");
          that.progressBar("stop");
          if (res.duration >= 120000) {
            wx.showToast({
              title: "录音限时两分钟",
              image: "../images/warning.png"
            });
          }
          if (res.duration > 500) {
            item.note.record.push({
              url: res.tempFilePath,
              duration: res.duration
            });
            that.data.playback.push({
              record_index: that.data.playback.length,
              url: res.tempFilePath,
              duration: res.duration,
              opacity: 1
            });
            wx.showToast({
              title: "第" + item.note.record.length + "条语音记事",
              icon: "none"
            });
          } else {
            wx.showToast({
              title: "语音录制过短",
              image: "../images/warning.png"
            });
          }
        });
      }
    });
  },

  /* 生命周期函数--监听页面显示 */
  onShow(res) {
    console.log("CreateNote onShow");
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current === bgiCurrent) {
      if (this.data.duration !== 500) this.data.duration = 500;
    } else this.data.current = bgiCurrent;
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady(res) {
    console.log("CreateNote onReady");
    if (this.data.duration !== 500) this.data.duration = 500;
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide(res) {
    console.log("CreateNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload(res) {
    console.log("CreateNote onUnload");
  },

  /* 自定义用户交互逻辑处理: 写记事  */


  /* 记事标题 */
  //记事标题的创建
  titleContent(res) {
    if (res.type === "input") {
      var value = res.detail.value;
      if (/\s+/g.test(value[0])) {
        value = value.replace(/\s+/, "");
        wx.showToast({
          title: "首字符不可为空",
          image: "../images/warning.png"
        });
      }
      item.note.title = value;
      this.data.title = value;
    } else if (res.type === "blur") {
      if (!item.note.title.length) {
        if (item.note.text.content.length > 0) {
          if (item.note.text.content.length < 20) {
            item.note.title = item.note.text.content;
          } else {
            item.note.title = item.note.text.content.substring(0, 20);
          }
        } else {
          var content = "";
          if (item.note.record.length > 0) {
            content += "S";
          }
          if (item.note.photo.length > 0) {
            content += "I";
          }
          if (item.note.video.length > 0) {
            content += "V";
          }
        };
        content += " ";
        if (!item.note.text.content.length) {
          if (content.length !== " ") content = "记事 ";
          var dateFn = new Date();
          item.note.title = content
            + dateFn.getFullYear()
            + (dateFn.getMonth() + 1 < 10 ?
              "0" + (dateFn.getMonth() + 1) :
              dateFn.getMonth() + 1)
            + (dateFn.getDate() < 10 ?
              "0" + dateFn.getDate() : dateFn.getDate())
            + (dateFn.getHours() < 10 ?
              "0" + dateFn.getHours() : dateFn.getHours())
            + (dateFn.getMinutes() < 10 ?
              "0" + dateFn.getMinutes() : dateFn.getMinutes())
            + (dateFn.getSeconds() < 10 ?
              "0" + dateFn.getSeconds() : dateFn.getSeconds());
        }
      } else if (item.note.title.length > 20) {
        item.note.title = item.note.title.substring(0, 20);
        wx.showToast({
          title: "标题最长二十字",
          image: "../images/warning.png"
        });
      }
      (function trim() {
        if (/\s+/g.test(item.note.title[item.note.title.length - 1])) {
          item.note.title = item.note.title.substring(0, item.note.title.length - 1);
          trim();
        }
      })()
      this.data.title = item.note.title;
    }
  },

  /* 文本记事 */
  //文本记事的创建
  getTextFn(res) {
    if (res.type === "tap") {
      this.data.noting = "text";
    } else if (res.type === "longpress" && item.note.text.content.length > 0) {
      var that = this;
      wx.showModal({
        title: "文本记事",
        content: "是否清空文本记事？",
        success(res) {
          if (res.confirm) {
            item.note.text = {
              content: "",
              fontSize: "100%",
              fontWeight: "normal",
              fontColor: "#000",
              fontIndex: [2, 1, 0]
            }
            that.data.text = item.note.text;
          }
        }
      })
    }
  },
  //文本记事的撰写
  textContent(res) {
    if (res.type === "input") {
      item.note.text.content = res.detail.value;
      this.data.text.content = item.note.text.content;
    } else if (res.type === "blur") {
      if (res.detail.value.length > 0 && !res.detail.value.trim()) {
        item.note.text.content = "";
        this.data.text = item.note.text;
        wx.showToast({
          title: "不能全输入空格",
          image: "../images/warning.png"
        });
      }
      var that = this;
      (function trim() {
        var content = item.note.text.content;
        if (/\s+/g.test(content[content.length - 1])) {
          item.note.text.content = content.substring(0, content.length - 1);
          trim();
        } else that.data.text.content = item.note.text.content;
      })()
    }
  },
  //获取字体样式修改功能
  setFontStyle(res) {
    var that = this;
    if (res.type === "tap") { //获取字体样式修改功能
      var fontStyle = new Object();
      //获取当前字体样式的设定信息
      for (let prop in item.note.text) fontStyle[prop] = item.note.text[prop];
      delete fontStyle["content"];
      this.fontStyle = fontStyle; //在this中存入当前字体样式的设定信息以供取消时恢复当前字体样式
      console.log("修改前的字体样式信息如下：", this.fontStyle);
    } else if (res.type === "columnchange") { //字体样式的展示
      switch (res.detail.column) {
        case 0: { //字体大小的设定；
          switch (res.detail.value) {
            case 0: { that.data.text.fontSize = "50%" }; break;
            case 1: { that.data.text.fontSize = "75%" }; break;
            case 2: { that.data.text.fontSize = "100%" }; break;
            case 3: { that.data.text.fontSize = "150%" }; break;
            case 4: { that.data.text.fontSize = "200%" }; break;
          }
        }; break;
        case 1: { //字体粗细的设定
          switch (res.detail.value) {
            case 0: { that.data.text.fontWeight = "lighter" }; break;
            case 1: { that.data.text.fontWeight = "normal" }; break;
            case 2: { that.data.text.fontWeight = "bolder" }; break;
          }
        }; break;
        case 2: { //字体颜色的设定
          switch (res.detail.value) {
            case 0: { that.data.text.fontColor = "#000"; }; break;
            case 1: { that.data.text.fontColor = "#F00"; }; break;
            case 2: { that.data.text.fontColor = "#8A2BE2"; }; break;
            case 3: { that.data.text.fontColor = "#00BFFF"; }; break;
            case 4: { that.data.text.fontColor = "#228B22"; }; break;
            case 5: { that.data.text.fontColor = "#D2691E"; }; break;
          }
        }; break;
      }
      this.data.text.fontIndex[res.detail.column] = res.detail.value;
    } else if (res.type === "change") { //确认字体样式的设定
      for (let prop in this.data.text) item.note["text"][prop] = this.data.text[prop];
      item.note.text.fontIndex = res.detail.value;
    } else if (res.type === "cancel") { //取消字体样式的设定
      for (let prop in this.fontStyle) this.data.text[prop] = this.fontStyle[prop];
    } else if (res.type === "longpress") { //重设字体到默认样式
      var style = new Object();
      for (let prop in item.note["text"]) style[prop] = item.note["text"][prop];
      delete style["content"];
      var origin = { fontSize: "100%", fontWeight: "normal", fontColor: "#000", fontIndex: [2, 1, 0] };
      if (JSON.stringify(style) !== JSON.stringify(origin)) {
        wx.showModal({
          title: "写记事",
          content: "是否重设字体到默认样式？",
          success(res) {
            if (res.confirm) {
              for (let prop in origin) {
                item.note.text[prop] = origin[prop];
              }
              that.data.text = item.note.text;
            }
          }
        });
      }
    }
  },


  /* 语音记事 */
  getVoiceFn(res) {
    if (res.type === "tap") {
      this.data.noting = "voice";
    } else if (res.type === "longpress" && item.note.record.length > 0) {
      var that = this;
      wx.showModal({
        title: "语音记事",
        content: "是否清空语音记事？",
        success(res) {
          if (res.confirm) {
            var nums = item.note.record.length;
            var sign = false;
            item.note.record.forEach((ele, index, origin) => {
              if (/store/.test(ele.url)) {
                wx.removeSavedFile({
                  filePath: ele.url,
                  complete(res) {
                    nums -= 1;
                    sign = true;
                  }
                });
              } else nums -= 1;
            });
            item.note.record = [];
            that.data.playback = [];
            (function waiting() {
              setTimeout(() => {
                if (nums > 0) {
                  waiting()
                } else if (sign) {
                  let note = wx.getStorageSync("note");
                  note[wx.getStorageSync("item_to_edit")].note.record = [];
                  wx.setStorageSync("note", note);
                }
              });
            })();
          }
        }
      });
    }
  },
  //开始语音记事
  startRecord(res) {
    var that = this;
    if (item.note.record.length < 5) {
      this.tag = false;
      recorderManager.start({
        duration: 120000,
        sampleRate: 44100,
        numberOfChannels: 2,
        encodeBitRate: 192000,
        format: "aac",
        frameSize: 50
      });
    } else {
      wx.showToast({
        title: "语音记事已满",
        image: "../images/warning.png"
      })
    }
  },
  //停止语音记事
  stopRecord(res) {
    this.tag = true;
    if (!this.recordNow && item.note.record.length < 5) {
      wx.showToast({
        title: "录制语音请长按",
        image: "../images/warning.png"
      });
    } else recorderManager.stop();
  },
  //语音记事的返听与删除
  playback_delete(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    if (res.type === "tap") {
      innerAudioContext.autoplay = true;
      innerAudioContext.src = this.data.playback[index].url;
      var duration = this.data.playback[index].duration;
      if (!duration || duration > 120000) duration = 500;
      var timeStamp = new Date().getTime();
      if (!this.timerQueue) that.timerQueue = [];
      for (let i = this.timerQueue.length - 1; i > 0; i--) clearTimeout(this.timerQueue[i]);
      (function breathingEffection() {
        if (that.data.playback[index].opacity < 0.3) that.flag = true;
        if (that.data.playback[index].opacity > 1) that.flag = false;
        if (that.flag) {
          that.data.playback[index].opacity += 0.025;
        } else that.data.playback[index].opacity -= 0.025;
        var timeout = setTimeout(() => {
          if (new Date().getTime() - timeStamp < duration - 35) {
            breathingEffection();
          } else {
            console.log("breathingEffection 误差: "
              + Math.abs(new Date().getTime() - timeStamp - duration));
            that.data.playback[index].opacity = 1;
          }
        }, 35);
        that.timerQueue.push(timeout);
      })()
    } else if (res.type === "longpress") {
      wx.showModal({
        title: "语音记事",
        content: "警告：删除操作将无法撤回，仍然删除本语音？",
        success(res) {
          if (res.confirm) {
            //相应语音的移除函数
            function deleteRecord() {
              that.data.playback[index].opacity -= 0.1;
              setTimeout(() => {
                if (that.data.playback[index].opacity <= 0) {
                  wx.hideLoading();
                  item.note.record.splice(index, 1);
                  var playback = [];
                  item.note.record.forEach((ele, id) => {
                    playback.push({
                      record_index: id,
                      url: ele.url,
                      duration: ele.duration,
                      opacity: 1
                    })
                  });
                  that.data.playback = playback;
                  wx.showToast({
                    title: "删除成功！",
                    image: "../images/success.png",
                    mask: true
                  });
                } else deleteRecord();
              }, 50)
            }
            wx.showLoading({
              title: "正在删除本语音",
              mask: true
            });
            if (/store/g.test(item.note.record[index].url)) {
              wx.removeSavedFile({
                filePath: item.note.record[index].url,
                complete(res) {
                  deleteRecord();
                  var note = wx.getStorageSync("note");
                  note[item.id] = item;
                  wx.setStorageSync("note", note);
                }
              });
            } else deleteRecord();
          }
        }
      });
    }
  },
  //当前页API：呼吸效果启动与截停
  breathingEffection(tag) {
    if (tag === "start") {
      this.animation = wx.createAnimation({ duration: 1000 });
      this.animation.backgroundColor("#FF0000").step();
      this.data.breathingEffection = this.animation.export();
      var that = this;
      timerA = setTimeout(() => {
        that.animation.backgroundColor("#F5F5DC").step();
        that.data.breathingEffection = that.animation.export();
      }, 1000);
      timerB = setTimeout(() => {
        that.breathingEffection("start");
      }, 2000)
    } else if (tag === "stop") {
      clearTimeout(timerA);
      clearTimeout(timerB);
      this.animation = wx.createAnimation({ duration: 0 });
      this.animation.backgroundColor("#F5F5DC").step();
      this.data.breathingEffection = this.animation.export();
    }
  },
  //当前页API：录音时长进度条的启动与复位
  progressBar(tag) {
    var that = this;
    if (tag === "start") {
      var start = new Date().getTime();
      (function recording() {
        timerC = setTimeout(() => {
          that.data.recording = (new Date().getTime() - start) / 1200;
          if ((new Date().getTime() - start) >= 120000) {
            that.data.recording = 0;
          } else recording(tag);
        }, 25);
      })()
    } else if (tag === "stop") {
      clearTimeout(timerC);
      var step = that.data.recording / 6.25;
      (function reset() {
        setTimeout(() => {
          if (that.data.recording > 0) {
            that.data.recording -= step
            reset();
          } else that.data.recording = 0;
        }, 10)
      })()
    }
  },

  /* 图片记事 */
  //图片记事的创建、打开相机组件和预览图片
  getPhotoFn(res) {
    var that = this;
    if (res.type === "tap") {
      function selectImage(length) {
        wx.chooseImage({
          count: length,
          sourceType: ["album"],
          success(res) {
            res.tempFiles.forEach(ele => { item.note.photo.push({ url: ele.path }); });
            setData();
          },
        });
      }
      function setData() {
        item.note.photo.forEach((ele, index) => {
          that.data.img[index] = {
            photo_index: index,
            url: ele.url
          }
        });
        that.data.noting = "photo";
        that.data.imgCurrent = 0;
      }
      if (getCameraAccess) {
        if (!item.note.photo.length) {
          wx.showActionSheet({
            itemList: ["拍照", "从手机相册获取图片"],
            success(res) {
              if (!res.tapIndex) {
                that.data.sw = true;
                that.data.ifPhoto = true;
                that.data.camSet = "back";
                that.data.flash = "off";
                that.data.flashSet = "../images/notflash.png";
                that.data.qualitySet = "Normal";
                that.data.cameraSet = "../images/photo.png";
                that.data.changeMode = "../images/shoot.png";
              } else selectImage(5 - item.note.photo.length);
            }
          });
        } else if (item.note.photo.length < 5) {
          wx.showActionSheet({
            itemList: ["拍照", "从手机相册获取图片", "预览图片"],
            success(res) {
              if (!res.tapIndex) {
                that.data.sw = true;
                that.data.ifPhoto = true;
                that.data.camSet = "back";
                that.data.flash = "off";
                that.data.flashSet = "../images/notflash.png";
                that.data.qualitySet = "Normal";
                that.data.cameraSet = "../images/photo.png";
                that.data.preview = that.data.img[that.data.img.length - 1].url;
                if (!item.note.video) {
                  that.data.changeMode = "../images/shoot.png";
                } else that.data.changeMode = "../images/null.png";
              } else if (res.tapIndex === 1) {
                selectImage(3 - item.note.photo.length);
              } else setData();
            }
          });
        } else setData();
      } else {
        if (!item.note.photo.length) {
          wx.showModal({
            title: "图片记事",
            content: "无相机权限，只能从手机相册获取图片",
            success(res) {
              if (res.confirm) selectImage(5);
            }
          });
        } else if (item.note.photo.length < 5) {
          wx.showActionSheet({
            itemList: ["从手机相册获取图片", "预览图片"],
            success(res) {
              if (!res.tapIndex) {
                selectImage(5 - item.note.photo.length);
              } else setData();
            }
          })
        } else setData();
      }
    } else if (res.type === "longpress" && item.note.photo.length > 0) {
      wx.showModal({
        title: "图片记事",
        content: "是否清空图片记事？",
        success(res) {
          var nums = item.note.photo.length;
          var sign;
          if (res.confirm) {
            item.note.photo.forEach((ele, index, origin) => {
              if (/store/.test(ele.url)) {
                wx.removeSavedFile({
                  filePath: ele.url,
                  complete(res) {
                    nums -= 1;
                    sign = true;
                  }
                });
              } else nums -= 1;
            });
            item.note.photo = [];
            that.data.img = [];
            (function waiting() {
              setTimeout(() => {
                if (nums > 0) {
                  waiting()
                } else if (sign) {
                  let note = wx.getStorageSync("note");
                  note[wx.getStorageSync("item_to_edit")].note.photo = item.note.photo;
                  wx.setStorageSync("note", note);
                }
              });
            })()
          }
        }
      });
    }
  },
  //图片记事全屏查看、保存到手机相册与删除
  check_deletePhoto(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    if (res.type === "tap") {
      wx.previewImage({
        urls: [this.data.img[index].url],
      });
    } else if (res.type === "longpress") {
      //相应照片的移除函数
      function deletePhoto() {
        function deletion() {
          var nums = 1;
          if (/store/g.test(item.note.photo[index].url)) {
            wx.removeSavedFile({
              filePath: item.note.photo[index].url,
              complete(res) { nums = 0; }
            });
          } else nums = 0;
          item.note.photo.splice(index, 1);
          item.note.photo.forEach((ele, id) => {
            that.data.img[id] = {
              photo_index: id,
              url: ele.url
            }
          });
          that.data.ifDeleting = true;
          if (that.data.imgCurrent > 0) that.data.imgCurrent = that.data.imgCurrent - 1;
          that.data.ifDeleting = false;
          if (!item.note.photo.length) that.data.noting = "menu";
          (function waiting() {
            setTimeout(() => {
              if (!nums && wx.getStorageSync("item_to_edit")) {
                let note = wx.getStorageSync("note");
                note[wx.getStorageSync("item_to_edit")].note.photo = item.note.photo;
                wx.setStorageSync("note", note);
                console.log("当前记事已预合并到总目录");
              } else if (!!nums) waiting();
            });
          })()
          wx.showToast({
            title: "删除成功！",
            image: "../images/success.png",
            mask: true
          });
        }
        wx.showModal({
          title: "图片记事",
          content: "警告：删除操作将无法撤回，仍然删除本图片？",
          success(res) {
            if (res.confirm) {
              wx.showLoading({
                title: "正在删除本图片",
                mask: true
              });
              if (/store/g.test(item.note.photo[index].url)) {
                wx.removeSavedFile({
                  filePath: item.note.photo[index].url,
                  complete(res) {
                    deletion();
                    var note = wx.getStorageSync("note");
                    note[item.id] = item;
                    wx.setStorageSync("note", note);
                  }
                });
              } else deletion();
            }
          }
        });
      }
      if (getAlbumAccess) {
        wx.showActionSheet({
          itemList: ["保存图片到手机相册", "删除本张图片"],
          success(res) {
            if (!res.tapIndex) {
              wx.saveImageToPhotosAlbum({
                filePath: item.note.photo[index].url,
                success(res) {
                  wx.showToast({
                    title: "保存操作成功！",
                    image: "../images/success.png",
                    mask: true
                  });
                },
                fail(res) {
                  wx.showToast({
                    title: "保存操作失败！",
                    image: "../images/error.png",
                    mask: true
                  });
                }
              });
            } else deletePhoto();
          }
        });
      } else {
        wx.showModal({
          title: "图片记事",
          content: "是否删除本张图片",
          success(res) {
            if (res.confirm) deletePhoto();
          }
        });
      }
    }
  },
  //实时获取图片展示当前滑块的索引
  setImgCurrent(res) {
    this.data.mgCurrent = res.detail.current;
  },

  /* 视频记事 */
  //视频记事尚的创建及查看功能权限的开启
  getShootFn(res) {
    var that = this;
    if (res.type === "tap") {
      function selectVideo() {
        wx.chooseVideo({
          sourceType: ["album"],
          camera: "back",
          success(res) {
            item.note.video = res.tempFilePath;
            that.data.video = item.note.video;
            wx.showModal({
              title: "视频记事",
              content: "是否即刻预览视频？",
              success(res) {
                if (res.confirm) that.data.noting = "video";
              }
            });
          }
        });
      }
      if (getCameraAccess) {
        if (!item.note.video) {
          wx.showActionSheet({
            itemList: ["录像", "从手机相册获取视频"],
            success(res) {
              if (!res.tapIndex) {
                that.data.sw = true;
                that.data.ifPhoto = false;
                that.data.camSet = "back";
                that.data.cameraSet = "../images/shoot.png";
                if (item.note.photo.length < 3) {
                  that.data.changeMode = "../images/photo.png";
                } else that.data.changeMode = "../images/null.png";
              } else selectVideo();
            }
          });
        } else {
          this.data.noting = "video";
          this.data.video = item.note.video;
        }
      } else {
        if (!!item.note.video) {
          wx.showModal({
            title: "视频记事",
            content: "无相机权限，只能查看已有视频记事",
            showCancel: false,
            success(res) {
              if (res.confirm) {
                this.data.video = item.note.video;
                this.data.noting = "video";
              }
            }
          });
        } else {
          wx.showModal({
            title: "视频记事",
            content: "无相机权限，只能从手机相册获取视频",
            success(res) {
              if (res.confirm) selectVideo();
            }
          });
        }
      }
    } else if (res.type === "longpress" && item.note.video.length > 0) {
      wx.showModal({
        title: "视频记事",
        content: "是否清空视频记事？",
        success(res) {
          if (res.confirm) {
            if (/store/g.test(item.note.video)) {
              wx.removeSavedFile({
                filePath: item.note.video,
                complete(res) {
                  let note = wx.getStorageSync("note");
                  note[wx.getStorageSync("item_to_id")].note.video = "";
                  wx.setStorageSync("note", note);
                }
              });
            }
            item.note.video = "";
            that.data.video = "";
          }
        }
      })
    }
  },
  //视频记事查看功能的退出、保存到手机相册与删除
  videoPreview(res) {
    var that = this;
    wx.showActionSheet({
      itemList: ["保存视频到手机相册", "删除视频"],
      success(res) {
        if (!res.tapIndex) {
          const videoControl = wx.createVideoContext(that.data.video);
          videoControl.pause();
          console.log(that.data.video);
          wx.saveVideoToPhotosAlbum({
            filePath: that.data.video,
            success(res) {
              wx.showToast({
                title: "保存操作成功！",
                image: "../images/succes.png",
                mask: true
              });
            },
            fail(res) {
              wx.showToast({
                title: "保存操作失败！",
                image: "../images/error.png",
                mask: true
              });
            }
          });
        } else {
          wx.showModal({
            title: "视频记事",
            content: "警告：删除操作将不可撤回，仍然删除本视频？",
            success(res) {
              if (res.confirm) {
                if (/store/g.test(item.note.video)) {
                  wx.removeSavedFile({
                    filePath: item.note.video,
                    complete(res) {
                      let note = wx.getStorageSync("note");
                      note[wx.getStorageSync("item_to_id")].note.video = "";
                      wx.setStorageSync("note", note);
                    }
                  });
                }
                item.note.video = "";
                this.data.video = "";
                wx.showToast({
                  title: "删除成功！",
                  image: "../images/success.png",
                  mask: true
                });
              }
            }
          })
        }
      }
    });
  },

  /* 保存和取消记事区 */
  //记事保存与取消
  save_cancel(res) {
    console.log("用户试图保存或取消当前记事");
    var that = this;
    var canISave = false;
    if ((item.note.title.length > 0) &&
      ((item.note.text.content.length > 0
        || item.note.record.length > 0)
        || item.note.video.length > 0)) canISave = true;
    if (canISave) {
      console.log("保存前的记事存储状态：",
        "\n记事标题：", item.note.title,
        "\n记事文本：", item.note.text,
        "\n语音记事：", item.note.record,
        "\n图片记事：", item.note.photo,
        "\n视频记事：", item.note.video);
      wx.showModal({
        title: "写记事",
        content: "是否保存当前记事？",
        success(res) {
          if (res.confirm) {
            wx.showLoading({
              title: "正在保存记事！",
              mask: true
            });
            var tag = new Proxy([0], {
              set(target, key, value, receiver) {
                if (parseInt(key) === 0 && value === 3) {
                  var note = wx.getStorageSync("note");
                  note[item.id] = item;
                  wx.setStorageSync("note", note);
                  console.log("成功保存当前记事并合并到总目录！");
                  wx.showToast({
                    title: "记事保存成功！",
                    image: "../images/success.png",
                    mask: true,
                    success(res) {
                      setTimeout(() => {
                        wx.showLoading({
                          title: "正在进入读记事",
                          mask: true,
                        });
                        wx.redirectTo({ url: "../ShowNote/ShowNote" });
                      }, 1500);
                    }
                  });
                }
                return Reflect.set(target, key, value, receiver);
              }
            });
            if (item.note.record.length > 0) {
              item.note.record.forEach((ele, index, origin) => {
                if (/tmp/g.test(ele.url)) {
                  console.log("开始保存第" + (index + 1) + "条语音");
                  wx.saveFile({
                    tempFilePath: ele.url,
                    success(res) {
                      ele.url = res.savedFilePath;
                      console.log("第" + (index + 1) + "条语音保存成功");
                    },
                    fail(res) {
                      wx.showToast({
                        title: "语音" + (index + 1) + "保存失败",
                        image: "../images/error.png"
                      });
                    },
                    complete(res) { if (index === item.note.record.length - 1) tag[0] += 1; }
                  });
                } else if (index === item.note.record.length - 1) tag[0] += 1;
              });
            } else tag[0] += 1;
            if (item.note.photo.length > 0) {
              item.note.photo.forEach((ele, index, origin) => {
                if (/tmp/g.test(ele.url)) {
                  console.log("开始保存第" + (index + 1) + "张图片");
                  wx.saveFile({
                    tempFilePath: ele.url,
                    success(res) {
                      ele.url = res.savedFilePath;
                      console.log("第" + (index + 1) + "张图片保存成功");
                    },
                    fail(res) {
                      wx.showToast({
                        title: "图片" + (index + 1) + "保存失败",
                        image: "../images/error.png"
                      });
                    },
                    complete(res) { if (index === item.note.photo.length - 1) tag[0] += 1; }
                  });
                } else if (index === item.note.photo.length - 1) tag[0] += 1;
              });
            } else tag[0] += 1;
            if (item.note.video.length > 0 && /tmp/g.test(item.note.video)) {
              console.log("开始保存视频");
              wx.saveFile({
                tempFilePath: item.note.video,
                success(res) {
                  item.note.video = res.savedFilePath;
                  console.log("视频保存成功");
                },
                fail(res) {
                  wx.showToast({
                    title: "视频保存失败！",
                    image: "../images/error.png"
                  });
                },
                complete(res) { tag[0] += 1; }
              })
            } else tag[0] += 1;
          } else {
            wx.showModal({
              title: "写记事",
              content: "是否继续当前记事？",
              success(res) {
                if (res.cancel) {
                  if (wx.getStorageSync("note").length > 0) {
                    wx.showLoading({
                      title: "正在进入读记事",
                      mask: true,
                    });
                    wx.redirectTo({ url: "../ShowNote/ShowNote" });
                  } else {
                    wx.showLoading({
                      title: "正在返回启动页",
                      mask: true,
                    });
                    wx.redirectTo({ url: "../Home/Home" });
                  }
                }
              }
            })
          }
        }
      });
    } else {
      wx.showModal({
        title: "写记事",
        content: "是否取消当前记事？",
        success(res) {
          if (res.confirm) {
            if (wx.getStorageInfoSync().keys.indexOf("note") !== -1) {
              if (wx.getStorageSync("note").length > 0) {
                wx.showLoading({
                  title: "正在进入读记事",
                  mask: true,
                });
                wx.redirectTo({ url: "../ShowNote/ShowNote" });
              } else {
                wx.showLoading({
                  title: "正在返回启动页",
                  mask: true,
                });
                wx.redirectTo({ url: "../Home/Home" });
              }
            } else {
              wx.showLoading({
                title: "正在返回启动页",
                mask: true,
              });
              wx.redirectTo({ url: "../Home/Home" });
            }
          }
        }
      })
    }
  },

  //背景图片的切换
  changeBackgroundImage(res) {
    if (res.type === "touchstart") {
      this.anchor = res.changedTouches[0].pageX;
    } else if (res.type === "touchmove") {
      var moveDistance = (res.changedTouches[0].pageX - this.anchor) * SWT;
      if (Math.abs(moveDistance) > 37.5 && !this.tagA) {
        this.tagA = true;
        if (moveDistance > 0) {
          this.data.bgiChange = 1;
        } else this.data.bgiChange = -1;
      }
    } else if (res.type === "touchend") {
      delete this.tagA;
      delete this.anchor;
      if (this.data.bgiChange === 1) {
        if (this.data.current + 1 < this.data.bgiQueue.length) {
          this.data.current += 1;
        }
      } else if (this.data.bgiChange === -1 && this.data.current - 1 >= 0) {
        this.data.current -= 1;
      }
      wx.setStorageSync("bgiCurrent", this.data.current);
      this.data.bgiChange = 0;
    }
  },

  //菜单栏的返回
  backToMenu(res) {
    if (this.data.noting === "voice") innerAudioContext.stop();
    this.data.noting = "menu";
    if (this.data.imgCurrent !== 0) this.data.mgCurrent = 0;
  },

  /* 相机组件 */
  //退出相机组件
  goback(res) {
    this.data.sw = false;
  },
  //摄像头前后置设定
  camSet(res) {
    var that = this;
    if (this.data.camSet === "front") {
      this.data.camSet = "back";
      if (that.data.flash === "on") {
        this.data.flashSet = "../images/flash.png";
      } else this.data.flashSet = "../images/notflash.png";
    } else {
      this.data.camSet = "front";
      this.data.flashSet = "../images/null.png";
    }
    this.data.camSign = 0;
    setTimeout(() => {
      that.data.camSign = 1;
    }, 500);
  },
  //闪光灯设定
  flashSet(res) {
    if (this.data.camSet === "back") {
      if (this.data.flash === "off") {
        this.data.flash = "on";
        this.data.flashSet = "../images/flash.png";
        wx.showToast({
          title: "闪光灯开启",
          icon: "none"
        });
      } else {
        this.data.flash = "off";
        this.data.flashSet = "../images/notflash.png";
        wx.showToast({
          title: "闪光灯关闭",
          icon: "none"
        });
      }
    }
  },
  //照片预览
  preview(res) {
    if (!this.data.ifPreview) {
      if (item.note.photo.length > 0) {
        this.data.ifPreview = true;
        this.data.img = item.note.photo;
      } else {
        wx.showToast({
          title: "图片记事为空",
          image: "../images/warning.png"
        });
      }
    } else this.data.ifPreview = false;
  },
  //主按钮设定：拍照、开始录像、停止录像
  cameraSet(res) {
    const camera = wx.createCameraContext();
    var that = this;
    //出错警告函数：重大故障，相机组件崩溃！
    function failure() {
      wx.showToast({
        title: "相机组件崩溃！",
        image: "../images/error.png",
        mask: true,
        complete(res) {
          if (that.data.shootNow) {
            clearTimeout(shootTimer);
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            if (that.data.shootSign === 1) that.data.shootSign = 0;
            that.data.shootNow = false;
            camera.stopRecord();
          }
          setTimeout(() => {
            that.data.sw = true;
          }, 1500);
        }
      });
    }
    if (this.data.cameraSet === "../images/photo.png") { //拍照模式
      var quality = this.data.qualitySet.toLowerCase();
      camera.takePhoto({
        quality: quality,
        success(res) {
          item.note.photo.push({ url: res.tempImagePath });
          that.data.img.push({
            photo_index: item.note.photo.length,
            url: res.tempImagePath
          });
          that.data.preview = res.tempImagePath;
          wx.showToast({
            title: "第" + that.data.img.length + "张图片记事",
            icon: "none",
            duration: 500,
            success(res) {
              that.data.ifPreview = true;
              that.data.imgCurrent = item.note.photo.length - 1;
              setTimeout(() => {
                that.data.ifPreview = false;
                that.data.imgCurrent = 0;
                if (!item.note.video && that.data.img.length >= 5) {
                  wx.showModal({
                    title: "图片记事",
                    content: "图片记事已满，仍然可以以录像方式进行视频记事，是否进入录像模式？",
                    success(res) {
                      if (res.confirm) {
                        that.data.cameraSet = "../images/shoot.png";
                        that.data.changeMode = "../images/null.png";
                        that.data.ifPhoto = false;
                      } else that.data.sw = true;
                    }
                  });
                } else if (that.data.img.length >= 5) that.data.sw = true;
              }, 1250);
            }
          });
        },
        fail(res) { failure(); }
      });
    } else if (this.data.cameraSet === "../images/shoot.png") { //录像模式
      function stopShoot() {
        camera.stopRecord({
          success(res) {
            clearTimeout(shootTimer);
            clearInterval(interval);
            clearTimeout(timerA);
            clearTimeout(timerB);
            if (that.data.shootSign === 1) that.data.shootSign = 0;
            item.note.video = res.tempVideoPath;
            wx.showToast({
              title: "视频记事成功！",
              image: "../images/success.png",
              mask: true,
              success(res) {
                wx.vibrateLong();
                that.data.shootNow = false;
                setTimeout(() => {
                  that.data.sw = false;
                  that.data.noting = "video";
                  that.data.video = item.note.video;
                }, 1500);
              }
            })
          },
          fail(res) {
            if (that.data.shootNow) {
              that.data.shootNow = false;
              camera.stopRecord();
            }
            failure();
          }
        });
      }
      if (!that.data.shootNow) {
        camera.startRecord({
          success(res) {
            that.data.shootNow = true;
            that.data.shootSign = 1;
            timerA = setTimeout(() => {
              that.data.shootSign = 0;
            }, 500);
            interval = setInterval(() => {
              that.data.shootSign = 1;
              timerB = setTimeout(() => {
                that.data.shootSign = 0;
              }, 500);
            }, 1000);
            wx.vibrateShort();
            shootTimer = setTimeout(() => {
              stopShoot();
              wx.showToast({
                title: "录像限时两分钟",
                images: "../images/warning.png",
                mask: false
              });
            }, 120000);
          },
          fail(res) { failure(); }
        });
      } else stopShoot();
    }
  },
  //更换设想模式：拍照、录像
  changeMode(res) {
    if (this.data.changeMode === "../images/shoot.png") {
      this.data.cameraSet = "../images/shoot.png";
      this.data.changeMode = "../images/photo.png";
      this.data.ifPhoto = false;
    } else if (this.data.changeMode === "../images/photo.png") {
      this.data.cameraSet = "../images/photo.png";
      this.data.changeMode = "../images/shoot.png";
      this.data.ifPhoto = true;
    }
  },
  //照片拍摄质量设定
  qualitySet(res) {
    if (this.data.qualitySet === "Normal") {
      this.data.qualitySet = "High";
    } else if (this.data.qualitySet === "High") {
      this.data.qualitySet = "Low";
    } else this.data.qualitySet = "Normal";
  }

});