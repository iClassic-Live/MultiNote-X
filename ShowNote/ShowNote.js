// ShowNote/ShowNote.js
/* 读记事页初始化 */

//获取用户本机的相对像素比
const SWT = 750 / wx.getSystemInfoSync().screenWidth;

//记事展示初始化
var tapTime; //监测相应按钮的按下时长
var anchor = [null, null, null]; //相应滑动操作的起始标识
//语音记事初始化
const innerAudioContext = wx.createInnerAudioContext(); //创建并返回内部 audio 上下文

/* 页面构造器：页面功能初始化 */
Page({

  /* 页面默认功能 */

  /* 页面的初始数据 */
  data: {

    //背景图切换功能初始化
    duration: 0, //背景图滑块切换的过渡时间
    current: wx.getStorageSync("bgiCurrent"), //背景图所在滑块序号
    bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列

    sw: "overview" //当前模块的标签
  },
  /* 生命周期函数--监听页面加载 */
  onLoad(res) {
    console.log("ShowNote onLoad");
    this.data = require("../api/api.js").rendering(this); //对data引入深度代理以实现渲染自动化
    wx.hideLoading();
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current !== bgiCurrent) this.data.current = bgiCurrent;
    wx.removeStorageSync("item_to_edit");
    var note = wx.getStorageSync("note");
    note.forEach((ele, index, origin) => {
      ele.id = index;
      ele.note.record.forEach((ele, id) => {
        ele.record_index = id;
        ele.opacity = 1;
      });
      ele.note.photo.forEach((ele, id) => {
        ele.photo_index = id;
      });
      ele.style = new Object();
      ele.style.opacity = 1;
      ele.style.pullOutDelete = 120;
      ele.style.pullOutMenu = 330;
      ele.style.bgc = "rgba(255, 255, 255, 0.5)";
    });
    this.data.note = note;
    console.log("当前记事渲染状况", this.data.note);
  },

  /* 生命周期函数--监听页面显示 */
  onShow(res) {
    console.log("ShowNote onShow");
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current === bgiCurrent) {
      if (this.data.duration !== 500) this.data.duration = 500;
    } else this.data.current = bgiCurrent;
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady(res) {
    console.log("ShowNote onReady");
    if (this.data.duration !== 500) this.data.duration = 500;
  },

  /* 生命周期函数--监听页面隐藏 */
  onHide(res) {
    console.log("ShowNote onHide");
  },

  /* 生命周期函数--监听页面卸载 */
  onUnload(res) {
    console.log("ShowNote onUnload");
  },

/* 自定义用户交互逻辑 */


  //记事检索功能
  search(res) {
    var that = this;
    function getResult() {
      var content = that.data.input.split("");
      if (content.length > 0) {
        content.forEach((ele, index) => {
          if ("*.?+$^[](){}|\\/".split("").indexOf(ele) !== -1) content[index] = "\\" + ele;
        });
        var reg = new RegExp().compile(content.join(""));
        var result = [];
        that.data.note.forEach((ele, index) => {
          if (reg.test(that.data.searchType ? ele.note.text.content : ele.note.title)) {
            result.push({
              id: ele.id,
              title: that.data.searchType ? ele.note.text.content : ele.note.title
            });
          }
        });
        that.data.result = result;
      } else that.data.result = [];
    }
    if (res.type === "focus") {
      if (!this.data.searching) {
        this.data.searching = true;
        wx.showToast({
          title: "检索记事" + (this.data.searchType ? "文本" : "标题"),
          icon: "none"
        });
      }
    } else if (res.type === "input") {
      if (!this.data.searching) this.data.searching = true;
      this.data.input = res.detail.value || "";
      getResult();
    } else if (res.type === "blur") {
      if (this.data.searching) {
        if (["", undefined].indexOf(this.data.input) !== -1 ||
            JSON.stringify(this.data.result) === "[]") {
          if ("input" in this.data) delete this.data.input;
          this.data.searching = false;
        }
      }
    } else if (res.type === "tap") {
      switch(!!this.data.searchType) {
        case true: { this.data.searchType = false; break; }
        case false: { this.data.searchType = true; break; }
      }
      wx.showToast({
        title: "检索记事" + (this.data.searchType ? "文本" : "标题"),
        icon: "none"
      });
      if (["", undefined].indexOf(this.data.input) === -1) getResult();
    }
  },
  //获取所点击的搜索结果所在概览中的位置或阅览所点击的搜索结果的文本记事
  gotoResult(res) {
    var that = this;
    var id = res.currentTarget.id.match(/\d+/g)[0];
    if ("input" in this.data) delete this.data.input;
    if ("result" in this.data) delete this.data.result;
    this.data.searching = false;
    if (this.data.searchType) {
      var note = this.data.note[id].note;
      this.data.sw = "text";
      this.data.title = note.title;
      this.data.text = note.text;
      if (note.record.length > 0) this.data.playback = note.record;
      if (note.photo.length > 0) this.data.img = note.photo;
      if (note.video.length > 0) this.data.video = note.video;
    }else {
      this.data.target = res.currentTarget.id;
      (function tips() {
        setTimeout(() => {
          if (!that.tag) {
            that.tag = true;
            that.data.note[id].style.bgc = "#f00";
            that.data.note[id].style.fontColor = "#fff";
          }else {
            that.tag = false;
            that.data.note[id].style.bgc = "rgba(255, 255, 255, 0.4)";
            that.data.note[id].style.fontColor = "#000";
          }
          if (that.times !== 3) {
            if (!that.hasOwnProperty("times")) that.times = 0;
            ++that.times;
            tips();
          }else {
            delete that.tag;
            delete that.times;
          }
        }, 250);
      })()
    }
  },

  //列表项各子项下删除按钮和菜单栏的拉动操作
  pullOutDel_Menu(res) {
    var that = this;
    var index = res.currentTarget.id;
    index = index.match(/\d+/g)[0];
    if (res.type === "touchmove") {
      if (!this.tagA) {
        this.tagA = true;
        this.hideMenu(index);
        anchor[1] = [res.changedTouches[0].pageX, new Date().getTime()];
      } else {
        this.tagB = true;
        var pullOutDelete = this.data.note[index].style.pullOutDelete;
        var pullOutMenu = this.data.note[index].style.pullOutMenu;
        var moveDistance = (res.changedTouches[0].pageX - anchor[1][0]) * SWT;
        if ((pullOutDelete >= 0 && pullOutDelete <= 120)
          && (moveDistance > 0 && Math.abs(moveDistance) < 120)) {
          if (pullOutMenu !== 330) {
            this.data.note[index].style.pullOutMenu = 330;
          }
          this.data.note[index].style.pullOutDelete = 120 - Math.abs(moveDistance)
        }
        if ((pullOutMenu >= 0 && pullOutMenu <= 330)
          && (moveDistance < 0 && Math.abs(moveDistance) < 330)) {
          if (pullOutDelete !== 120) {
            this.data.note[index].style.pullOutDelete = 120;
          }
          this.data.note[index].style.pullOutMenu = 330 - Math.abs(moveDistance);
        }
      }
    } else if (res.type === "touchend" && this.tagB) {
      delete this.tagA;
      delete this.tagB;
      (function showOff() {
        setTimeout(() => {
          var style = that.data.note[index].style;
          if (style.pullOutDelete > 0 && style.pullOutDelete < 80) {
            that.data.note[index].style.pullOutDelete -= 10
            if (that.data.note[index].style.pullOutDelete < 0) {
              that.data.note[index].style.pullOutDelete = 0;
            }
            if (that.data.note[index].style.pullOutDelete > 0) showOff();
          } else {
            that.data.note[index].style.pullOutDelete += 10
            if (that.data.note[index].style.pullOutDelete > 120) {
              that.data.note[index].style.pullOutDelete = 120;
            }
            if (that.data.note[index].style.pullOutDelete < 120) showOff();
          }
          if (style.pullOutMenu > 0 && style.pullOutMenu < 247.5) {
            that.data.note[index].style.pullOutMenu -= 25;
            if (that.data.note[index].style.pullOutMenu < 0) {
              that.data.note[index].style.pullOutMenu = 0;
            }
            if (that.data.note[index].style.pullOutMenu > 0) showOff();
          } else {
            that.data.note[index].style.pullOutMenu += 25;
            if (that.data.note[index].style.pullOutMenu > 330) {
              that.data.note[index].style.pullOutMenu = 330;
            }
            if (that.data.note[index].style.pullOutMenu < 330) showOff();
          }
        }, 15)
      })();
    }
  },
   //列表项各子项下的删除按钮、菜单栏复位操作
  cancel(res) {
    if (/n/g.test(res.currentTarget.id)) {
      var id = res.currentTarget.id.match(/\d+/g)[0];
      var pullOutMenu = this.data.note[id].style.pullOutMenu;
      var pullOutDelete = this.data.note[id].style.pullOutDelete;
      var condition = (res.touches[0].pageX * SWT < 400 &&
                                pullOutMenu !== 330) ||
                                pullOutDelete !== 120;
      if (condition) this.hideMenu();
    } else this.hideMenu();
  },
  //相应记事的修改操作
  editNote(res) {
    var that = this;
    var id = res.currentTarget.id.match(/\d+/g)[0];
    this.data.note[id].style.bgc = "#f00";
    this.data.note[id].style.fontColor = "#fff";
    wx.showModal({
      title: "读记事",
      content: "是否修改当前记事？",
      success(res) {
        that.data.note[id].style.bgc = "rgba(255, 255, 255, 0.4)";
        that.data.note[id].style.fontColor = "#000";
        if (res.confirm) {
          wx.setStorageSync("item_to_edit", id);
          wx.redirectTo({ url: "../CreateNote/CreateNote" });
        }
      }
    });
  },
  //列表项各子项下的删除操作
  deleteNote(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    this.hideMenu();
    (function tips() {
      setTimeout(() => {
        if (that.data.note[index].style.pullOutDelete !== 120
          || that.data.note[index].style.pullOutMenu !== 330) {
            tips();
        } else {
          that.data.note[index].style.bgc = "#f00";
          that.data.note[index].style.fontColor = "#fff";
        }
      });
    })();
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: "开始删除本记事",
            mask: true
          });
          var tag = new Proxy([0], {
            set(target, key, value, receiver) {
              if (parseInt(key) === 0 && value >= 3) {
                (function deleting() {
                  that.data.note[index].style.opacity -= 0.05;
                  setTimeout(() => {
                    if (that.data.note[index].style.opacity <= 0) {
                      wx.hideLoading();
                      that.data.note.splice(index, 1);
                      if (!!note.length) {
                        note.forEach((ele, index, origin) => {
                          if (ele.id !== index) {
                            ele.id = index;
                            ele.style.marginTop = index * 9.5;
                          }
                        });
                      }
                      wx.setStorageSync("note", that.data.note);
                      wx.showToast({
                        title: "当前记事已删除",
                        image: "../images/success.png",
                        mask: true,
                        complete(res) {
                          if (!note.length) {
                            setTimeout(() => {
                              wx.showModal({
                                title: "读记事",
                                content: "缓存中已无任何记事，将返回写记事！",
                                showCancel: false,
                                complete(res) { wx.redirectTo({ url: "../CreateNote/CreateNote" }); }
                              });
                            }, 1500);
                          }
                        }
                      });
                    } else deleting();
                  }, 25);
                })();
              }
              return Reflect.set(target, key, value, receiver);
            }
          });
          var note = that.data.note;
          if (note[index].note.record.length > 0) {
            note[index].note.record.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag[0] += 1; }
              });
            });
          } else tag[0] += 1;
          if (note[index].note.photo.length > 0) {
            note[index].note.photo.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag[0] += 1; }
              });
            });
          } else tag[0] += 1;
          if (note[index].note.video.length > 0) {
            wx.removeSavedFile({
              filePath: note[index].note.video,
              complete(res) { tag[0] += 1; }
            })
          } else tag[0] += 1;
        } else {
          that.data.note[index].style.bgc = "rgba(255, 255, 255, 0.4)";
          that.data.note[index].style.fontColor = "#000";
        }
      }
    });
  },
  //列表项各子项下的记事内容获取操作
  getContent(res) {
    var that = this;
    var label = res.currentTarget.id;
    var index = label.match(/\d+/g)[0];
    label = label.slice(0, label.indexOf("_"));
    if (label === "voice") label = "record";
    if (label === "image") label = "photo";
    if (label === "text") {
      var condition = this.data.note[index].note.text.content.length > 0
    } else var condition = this.data.note[index].note[label].length > 0;
    if (condition) {
      this.hideMenu();
      if (label === "record") label = "voice";
      if (label === "photo") label = "image";
      this.data.sw = label;
      this.data.title = this.data.note[index].note.title;
      var note = this.data.note[index].note;
      if (note.text.content.length > 0) this.data.text = note.text;
      if (note.record.length > 0) {
        that.data.playback = [];
        note.record.forEach((ele, id) => {
          that.data.playback.push({
            record_index: id,
            url: ele.url,
            duratoin: ele.duration,
            opacity: 1
          })
        });
      }
      if (note.photo.length > 0) {
        that.data.img = [];
        note.photo.forEach((ele, id) => {
          that.data.img.push({
            photo_index: id,
            url: ele.url
          })
        });
      }
      if (note.video.length > 0) this.data.video = note.video;
    } else {
      if (label === "record") label = "voice";
      if (label === "photo") label = "image";
      switch (label) {
        case "text": var content = "文本记事"; break;
        case "voice": var content = "语音记事"; break;
        case "image": var content = "图片记事"; break;
        case "video": var content = "视频记事"; break;
      }
      wx.showToast({
        title: "该项无" + content,
        image: "../images/warning.png"
      });
    }
  },
  //当前页API：复位所有未复位的删除按钮和菜单栏
  hideMenu(item) {
    var that = this;
    var unhiddenQueue = [];
    this.data.note.forEach((ele, index) => {
      if (parseInt(item) !== index) {
        if (ele.style.pullOutDelete < 120) unhiddenQueue.push({ tag: "pullOutDelete", index: index });
        if (ele.style.pullOutMenu < 330) unhiddenQueue.push({ tag: "pullOutMenu", index: index });
      }
    });
    unhiddenQueue.forEach(ele => {
      if (ele.tag === "pullOutDelete") {
        (function hideDel() {
          setTimeout(() => {
            that.data.note[ele.index].style.pullOutDelete += 10;
            if (that.data.note[ele.index].style.pullOutDelete > 120) {
              that.data.note[ele.index].style.pullOutDelete = 120;
            }
            if (that.data.note[ele.index].style.pullOutDelete < 120) hideDel();
          }, 15);
        })()
      }
      if (ele.tag === "pullOutMenu") {
        (function hideMenu() {
          setTimeout(() => {
            that.data.note[ele.index].style.pullOutMenu += 25;
            if (that.data.note[ele.index].style.pullOutMenu > 330) {
              that.data.note[ele.index].style.pullOutMenu = 330;
            }
            if (that.data.note[ele.index].style.pullOutMenu < 330) hideMenu();
          }, 15);
        })()
      }
    });
  },

  //背景图的切换
  changeBackgroundImage(res) {
    if (res.type === "touchstart") {
      anchor[0] = res.changedTouches[0].pageX;
    } else if (res.type === "touchmove") {
      var moveDistance = (res.changedTouches[0].pageX - anchor[0]) * SWT;
      if (Math.abs(moveDistance) > 37.5 && !this.tagA) {
        this.tagA = true;
        if (moveDistance > 0) {
          this.data.bgiChange = 1;
        } else this.data.bgiChange = -1;
      }
    } else if (res.type === "touchend") {
      delete this.tagA;
      anchor[0] = null;
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
  //记事的新建
  createNote(res) {
    wx.redirectTo({ url: "../CreateNote/CreateNote" })
  },

  //返回概览区
  backToOverview(res) {
    this.data.sw = "overview";
    delete this.data.title;
    delete this.data.text;
    delete this.data.playback;
    delete this.data.photo;
    delete this.data.video;
    innerAudioContext.stop();
  },
  //记事文本的操作
  getTextInfo(res) {
    var that = this;
    wx.setClipboardData({
      data: that.data.text.content,
      success(res) {
        wx.showToast({
          title: "成功复制文本！",
          image: "../images/success.png",
        });
      },
      fail(res) {
        wx.showToast({
          title: "无法复制文本！",
          image: "../images/error.png"
        });
      }
    });
  },
  //记事语音的操作
  getVoiceInfo(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    var timeStamp = new Date().getTime();
    if ("opacity" in this.data.playback[index] === false) {
      this.data.playbaclk[index].opacity = 1;
    }
    if ("timerQueue" in this) {
      for (let i = this.timerQueue.length - 1; i > 0; i--) clearTimeout(this.timerQueue[i]);
      this.data.playback.forEach((ele, id, origin) => {
        if (id !== index && ele.opacity < 1) this.data.playbaclk[index].opacity = 1;
      });
    } else this.timerQueue = [];
    (function breathingEffection() {
      if (that.data.playback[index].opacity >= 1) that.flag = true;
      if (that.data.playback[index].opacity <= 0.3) that.flag = false;
      var timer = setTimeout(() => {
        if (new Date().getTime() - timeStamp < that.data.playback[index].duration - 35) {
          if (that.flag) {
            that.data.playbaclk[index].opacity -= 0.025;
          } else that.data.playbaclk[index].opacity += 0.025;
          breathingEffection();
        } else {
          that.data.playbaclk[index].opacity = 1;
          delete that.flag;
        }
      }, 35);
      if (that.timerQueue.indexOf(timer) === -1) that.timerQueue.push(timer);
    })();
    innerAudioContext.autoplay = "true";
    innerAudioContext.src = this.data.playback[index].url;
  },
  //记事图片的操作
  getImageInfo(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    function saveImage() {
      wx.showModal({
        title: "读记事",
        content: "是否保存当前图片到本地？",
        success(res) {
          if (res.confirm) {
            wx.saveImageToPhotosAlbum({
              filePath: that.data.img[index].url,
              success(res) {
                wx.showToast({
                  title: "保存图片成功！",
                  image: "../images/success.png"
                });
              },
              fail(res) {
                wx.showToast({
                  title: "保存图片失败！",
                  image: "../images/error.png"
                });
              }
            })
          }
        }
      });
    }
    function failure() {
      wx.showModal({
        title: "读记事",
        content: "警告：没有保存到相册的权限，无法保存图片到本地！",
        showCancel: false
      });
    }
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.openSetting();
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success(res) { saveImage(); },
            fail(res) {
              wx.openSetting({
                success(res) {
                  if (res.authSetting['scope.writePhotosAlbum']) {
                    saveImage();
                  } else failure();
                },
                fail(res) { failure(); }
              });
            },
            complete(res) {
              console.log("authorize");
            }
          });
        } else saveImage();
      },
      fail(res) {
        wx.showModal({
          title: "读记事",
          content: "警告：无法读取权限获取信息！",
          showCancel: false
        });
      }
    });
  },
  //记事视频的操作
  getVideoInfo(res) {
    function saveVideo() {
      var that = this;
      wx.showModal({
        title: "读记事",
        content: "是否保存当前视频到本地？",
        success(res) {
          if (res.confirm) {
            wx.saveImageToPhotosAlbum({
              filePath: that.data.video,
              success(res) {
                wx.showToast({
                  title: "保存视频成功！",
                  image: "../images/success.png"
                });
              },
              fail(res) {
                wx.showToast({
                  title: "保存视频失败！",
                  image: "../images/error.png"
                });
              }
            })
          }
        }
      });
    }
    function failure() {
      wx.showModal({
        title: "读记事",
        content: "警告：没有保存到相册的权限，无法保存视频到本地！",
        showCancel: false
      });
    }
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success(res) { saveVideo(); },
            fail(res) {
              wx.openSetting({
                success(res) {
                  if (res.authSetting['scope.writePhotosAlbum']) {
                    saveVideo();
                  } else failure();
                },
                fail(res) { failure(); }
              });
            },
            complete(res) {
              console.log("authorize");
            }
          });
        } else saveVideo();
      },
      fail(res) {
        wx.showModal({
          title: "读记事",
          content: "警告：无法读取权限获取信息！",
          showCancel: false
        });
      }
    });
  },
  //记事间的快速跳转
  jumpToAnother(res) {
    if (res.type === "touchmove" && !this.tag) {
      this.tagA = true;
      this.tagB = true;
      var whichShowNow = this.data.sw; //正在展示的记事类型
      this.whichShowNow = whichShowNow;
      var whichCanShow = [];
      if (this.data.text) whichCanShow.push("text");
      if (this.data.playback) whichCanShow.push("voice");
      if (this.data.img) whichCanShow.push("Video");
      if (this.data.video) whichCanShow.push("video");
      this.whichCanShow = whichCanShow;
      anchor[2] = [res.touches[0].pageY, new Date().getTime()];
    } else if (res.type === "touchend" && this.tagB) {
      delete this.tagA;
      delete this.tagB;
      var moveDistance = (res.changedTouches[0].pageY - anchor[2][0]) * SWT;
      if (Math.abs(moveDistance) >= 187.5 && new Date().getTime() - anchor[2][1] < 2500) {
        var whichShowNow = this.whichShowNow;
        var whichCanShow = this.whichCanShow;
        var index = whichCanShow.indexOf(whichShowNow);
        if (moveDistance > 0) {
          if (index + 1 < whichCanShow.length) { //判断下一种记事类型是否存在
            this.data.sw = whichCanShow[index + 1];
          } else this.backToOverview();
        } else {
          if (index - 1 >= 0) { //判断上一种记事类型是否存在
            this.data.sw = whichCanShow[index - 1];
          } else this.backToOverview();
        }
      }
    }
  }

});