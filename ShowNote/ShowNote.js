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
    current: wx.getStorageSync("bgiCurrent") || 0, //背景图所在滑块序号
    bgiQueue: getApp().globalData.bgiQueue, //背景图地址队列

    note: wx.getStorageSync("note") || [], //全部记事信息的渲染
    sw: "overview",
  },
  /* 生命周期函数--监听页面加载 */
  onLoad(res) {
    console.log("ShowNote onLoad");
    wx.hideLoading();
    var bgiCurrent = wx.getStorageSync("bgiCurrent") || 0;
    if (this.data.current !== bgiCurrent) this.setData({ current: bgiCurrent });
    wx.removeStorageSync("item_to_edit");
    var note = wx.getStorageSync("note") || [];
    note.forEach((ele, index, origin) => {
      ele.id = index;
      ele.style = new Object();
      ele.style.opacity = 1;
      ele.style.pullOutDelete = 120;
      ele.style.pullOutMenu = 330;
      ele.style.bgc = "rgba(255, 255, 255, 0.5)";
    });
    this.setData({ note: note });
    console.log("当前记事渲染状况", this.data.note);
  },

  /* 生命周期函数--监听页面显示 */
  onShow(res) {
    console.log("ShowNote onShow");
    var bgiCurrent = wx.getStorageSync("bgiCurrent");
    if (this.data.current === bgiCurrent) {
      if (this.data.duration !== 500) this.setData({ duration: 500 });
    } else this.setData({ current: bgiCurrent });
  },

  /* 生命周期函数--监听页面初次渲染完成 */
  onReady(res) {
    console.log("ShowNote onReady");
    if (this.data.duration !== 500) this.setData({ duration: 500 });
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

  /* 背景图切换区 */
  //背景图切换

  search(res) {
    var that = this;
    if (res.type === "focus") {
      this.hideMenu();
      that.setData({
        searching: true,
        focus: true
      });
      setTimeout(() => {
        if (!that.data.searching) that.setData({ searching: true });
      }, 100);
      wx.showToast({
        title: "检索记事" + (that.data.searchType ? "文本" : "标题"),
        icon: "none"
      });
    }else if (res.type === "input") {
      //使用简单的正则表达式对记事进行相应检索
      this.setData({ input: String(res.detail.value) });
      if(!this.data.searching) this.setData({ searching: true });
      var reg = /'/;
      try {
        reg.compile(that.data.input)
      }
      catch (error) {
        wx.showModal({
          title: "读记事",
          content: "警告：请勿输入特殊字符进行检索！",
        });
        reg.compile = /'/;
        that.setData({ input: "" });
      }
      var result = [];
      if (!that.data.searchType) {
        that.data.note.forEach((ele, index, origin) => {
          if (reg.test(ele.note.title)) {
            result.push({
              id: ele.id,
              title: ele.note.title
            });
          }
        });
      } else {
        that.data.note.forEach((ele, index, origin) => {
          if (reg.test(ele.note.text.content)) {
            var content = String(ele.note.text.content);
            if (content.length > 20) content = content.substring(0, 20);
            result.push({
              id: ele.id,
              title: content
            });
            this.tmp = {
              title: ele.note.title,
              text: ele.note.text
            }
          }
        });
      }
      if (!!that.data.input) {
        that.setData({ result: result });
      } else that.setData({ result: [] });
    }else if (res.type === "blur") {
      if (!this.data.input && this.data.input !== 0) {
        this.setData({
          searching: false,
          result: null
        });
      }
    }else if (res.type === "tap") {
      this.setData({ focus: false });
      if (this.data.searchType) {
        this.setData({ searchType: false });
      } else this.setData({ searchType: true});
      wx.showToast({
        title: "检索记事" + (that.data.searchType ? "文本" : "标题"),
        icon: "none"
      });
      if (this.data.searching) {
        this.search({
          "type": "input",
          "detail": {
            "value": String(this.data.input)
          }
        });
      }
    }
  },

  pullOutDel_Menu(res) {
    var that = this;
    var index = res.currentTarget.id;
    index = index.match(/\d+/g)[0];
    if (res.type === "touchmove") {
      if (!this.tagA) {
        this.tagA = true;
        this.hideMenu(index);
        anchor[1] = [res.changedTouches[0].pageX, new Date().getTime()];
      }else {
        this.tagB = true;
        var pullOutDelete = this.data.note[index].style.pullOutDelete;
        var pullOutMenu = this.data.note[index].style.pullOutMenu;
        var moveDistance = (res.changedTouches[0].pageX - anchor[1][0]) * SWT;
        if ((pullOutDelete >= 0 && pullOutDelete <= 120) 
             && (moveDistance > 0 && Math.abs(moveDistance) < 120)) {
          if (pullOutMenu !== 330) {
            this.setData({ ["note[" + index + "].style.pullOutMenu"]: 330 });
          }
          this.setData({ ["note[" + index + "].style.pullOutDelete"]: 120 - Math.abs(moveDistance) });
        }
        if ((pullOutMenu >= 0 && pullOutMenu <= 330) 
             && (moveDistance < 0 && Math.abs(moveDistance) < 330)) {
          if (pullOutDelete !== 120) {
            this.setData({ ["note[" + index + "].style.pullOutDelete"]: 120 });
          }
          this.setData({ ["note[" + index + "].style.pullOutMenu"]: 330 - Math.abs(moveDistance) });
        }
      }
    } else if (res.type === "touchend" && this.tagB) {
      this.tagA = false;
      this.tagB = false;
      (function showOff() {
        setTimeout(() => {
          var style = that.data.note[index].style;
          if (style.pullOutDelete > 0 && style.pullOutDelete < 80) {
            that.data.note[index].style.pullOutDelete -= 10
            if (that.data.note[index].style.pullOutDelete < 0) {
              that.data.note[index].style.pullOutDelete = 0;
            }
            that.setData({
            ["note[" + index + "].style.pullOutDelete"]:
              that.data.note[index].style.pullOutDelete
            });
            if (that.data.note[index].style.pullOutDelete > 0) showOff();
          } else {
            that.data.note[index].style.pullOutDelete += 10
            if (that.data.note[index].style.pullOutDelete > 120) {
              that.data.note[index].style.pullOutDelete = 120;
            }
            that.setData({
            ["note[" + index + "].style.pullOutDelete"]:
              that.data.note[index].style.pullOutDelete
            });
            if (that.data.note[index].style.pullOutDelete < 120) showOff();
          }
          if (style.pullOutMenu > 0 && style.pullOutMenu < 247.5) {
            that.data.note[index].style.pullOutMenu -= 25;
            if (that.data.note[index].style.pullOutMenu < 0) {
              that.data.note[index].style.pullOutMenu = 0;
            }
            that.setData({
            ["note[" + index + "].style.pullOutMenu"]:
              that.data.note[index].style.pullOutMenu
            });
            if (that.data.note[index].style.pullOutMenu > 0) showOff();
          } else {
            that.data.note[index].style.pullOutMenu += 25;
            if (that.data.note[index].style.pullOutMenu > 330) {
              that.data.note[index].style.pullOutMenu = 330;
            }
            that.setData({
            ["note[" + index + "].style.pullOutMenu"]:
              that.data.note[index].style.pullOutMenu
            });
            if (that.data.note[index].style.pullOutMenu < 330) showOff();
          }
        }, 15)
      })();
    }
  },
  operateNote(res) {
    var that = this;
    var id = res.currentTarget.id;
    if (!this.data.searching) {
      var condition = false;
      if (!!id) {
        id = id.match(/\d+/g)[0];
        var pullOutMenu = this.data.note[id].style.pullOutMenu;
        var pullOutDelete = this.data.note[id].style.pullOutDelete;
        condition = (pullOutDelete === 120 && pullOutMenu === 330);
        if ((res.touches[0].pageX * SWT < 400 &&
            pullOutMenu !== 330) ||
            pullOutDelete !== 120) this.hideMenu();
      }else this.hideMenu();
      if (condition) {
        this.hideMenu();
        this.setData({
          ["note[" + id + "].style.bgc"]: "#f00",
          ["note[" + id + "].style.fontColor"]: "#fff"
        });
        wx.showModal({
          title: "读记事",
          content: "是否修改当前记事？",
          success(res) {
            that.setData({
              ["note[" + id + "].style.bgc"]: "rgba(255, 255, 255, 0.4)",
              ["note[" + id + "].style.fontColor"]: "#000"
            });
            if (res.confirm) {
              wx.setStorageSync("item_to_edit", id);
              wx.redirectTo({ url: "../CreateNote/CreateNote" });
            }
          }
        });
      }
    }else if (!!id) {
      id = id.match(/\d+/g)[0];
      this.setData({
        input: "",
        result: null,
        searching: false,
      });
      if (!this.data.searchType) {
        this.setData({
          target: res.currentTarget.id,
          ["note[" + id + "].style.bgc"]: "#f00",
          ["note[" + id + "].style.fontColor"]: "#fff",
        });
        setTimeout(() => {
          that.setData({
            ["note[" + id + "].style.bgc"]: "rgba(255, 255, 255, 0.4)",
            ["note[" + id + "].style.fontColor"]: "#000",
          });
          setTimeout(() => {
            that.setData({
              ["note[" + id + "].style.bgc"]: "#f00",
              ["note[" + id + "].style.fontColor"]: "#fff",
            })
            setTimeout(() => {
              that.setData({
                ["note[" + id + "].style.bgc"]: "rgba(255, 255, 255, 0.4)",
                ["note[" + id + "].style.fontColor"]: "#000",
              });
            }, 250)
          }, 250)
        }, 250);
      }else {
        var note = this.data.note[id].note
        this.setData({
          title: note.title,
          text: note.text,
          sw: "text"
        });
        if (note.record.length > 0) this.setData({ playback: note.record });
        if (note.photo.length > 0) this.setData({ img: note.photo });
        if (note.video.length > 0) this.setData({ videoSrc: note.video });
      }
    }
  },
  deleteNote(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    this.hideMenu();
    (function tips () {
      setTimeout(() => {
        if (that.data.note[index].style.pullOutDelete !== 120
          || that.data.note[index].style.pullOutMenu !== 330) {
          tips();
        } else {
          that.setData({
            ["note[" + index + "].style.bgc"]: "#f00",
            ["note[" + index + "].style.fontColor"]: "#fff",
          });
        }
      }, 10);
    })()
    wx.showModal({
      title: "读记事",
      content: "是否删除本条记事？",
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: "开始删除本记事",
            mask: true
          });
          var tag = 0;
          var note = that.data.note;
          if (note[index].note.record.length > 0) {
            note[index].note.record.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag += 1; }
              });
            });
          } else tag += 1;
          if (note[index].note.photo.length > 0) {
            note[index].note.photo.forEach((ele, id, origin) => {
              wx.removeSavedFile({
                filePath: ele.url,
                complete(res) { if (id === origin.length - 1) tag += 1; }
              });
            });
          } else tag += 1;
          if (note[index].note.video.length > 0) {
            wx.removeSavedFile({
              filePath: note[index].note.video,
              complete(res) { tag += 1; }
            })
          } else tag += 1;
          (function deleting () {
            if (tag < 3) {
              setTimeout(() => {
                deleting();
              }, 20)
            }else {
              that.data.note[index].style.opacity -= 0.05;
              that.setData({ note: that.data.note });
              setTimeout(() => {
                if (that.data.note[index].style.opacity <= 0) {
                  wx.hideLoading();
                  note.splice(index, 1);
                  if (!!note.length) {
                    note.forEach((ele, index, origin) => {
                      if (ele.id !== index) {
                        ele.id = index;
                        ele.style.marginTop = index * 9.5;
                      }
                    });
                  }
                  that.setData({ note: note });
                  wx.setStorageSync("note", note);
                  wx.showToast({
                    title: "当前记事已删除",
                    image: "../images/success.png",
                    mask: true,
                    complete(res) {
                      setTimeout(() => {
                        if (!note.length) {
                          wx.showModal({
                            title: "读记事",
                            content: "缓存中已无任何记事，将返回写记事！",
                            showCancel: false,
                            complete(res) { wx.redirectTo({ url: "../CreateNote/CreateNote" }); }
                          })
                        }
                      }, 1500);
                    }
                  });
                } else deleting();
              }, 25)
            }
          })();
        } else {
          that.setData({
            ["note[" + index + "].style.bgc"]: "rgba(255, 255, 255, 0.4)",
            ["note[" + index + "].style.fontColor"]: "#000",
          });
        }
      }
    });
  },
  getContent(res) {
    var label = res.currentTarget.id;
    var index = label.match(/\d+/g)[0];
    label = label.slice(0, label.indexOf("_"));
    if (label === "voice") label = "record";
    if (label === "image") label = "photo";
    if (label === "text") {
      var condition = this.data.note[index].note.text.content.length > 0
    }else var condition = this.data.note[index].note[label].length > 0;
    if (condition) {
      this.hideMenu();
      this.setData({
        sw: label === "record" ? "voice" : label === "photo" ? "image" : label,
        title: this.data.note[index].note.title,
      });
      var note = this.data.note[index].note;
      if (note.text.content.length > 0) this.setData({ text: note.text });
      if (note.record.length > 0) this.setData({ playback: note.record });
      if (note.photo.length > 0) this.setData({ img: note.photo });
      if (note.video.length > 0) this.setData({ videoSrc: note.video });
    }else {
      switch (label) {
        case "text": var content = "文本记事"; break;
        case "record": var content = "语音记事"; break;
        case "photo": var content = "图片记事"; break;
        case "video": var content = "视频记事"; break;
      }
      wx.showToast({
        title: "该项无" + content,
        image: "../images/warning.png"
      });
    }
  },
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
            that.setData({
            ["note[" + ele.index + "]style.pullOutDelete"]:
              that.data.note[ele.index].style.pullOutDelete
            });
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
            that.setData({
            ["note[" + ele.index + "]style.pullOutMenu"]:
              that.data.note[ele.index].style.pullOutMenu
            });
            if (that.data.note[ele.index].style.pullOutMenu < 330) hideMenu();
          }, 15);
        })()
      }
    });
  },
  
  backgroundImageChange(res) {
    if (res.type === "touchstart") {
      anchor[0] = res.changedTouches[0].pageX;
    }else if (res.type === "touchmove") {
      var moveDistance = (res.changedTouches[0].pageX - anchor[0]) * SWT;
      if (Math.abs(moveDistance) > 37.5 && !this.tagA) {
        this.tagA = true;
        if (moveDistance > 0) {
          this.setData({ bgiChange: 1 });
        } else this.setData({ bgiChange: -1 });
      }
    }else if (res.type === "touchend") {
      this.tagA = false;
      anchor[0] = null;
      if (this.data.bgiChange === 1) {
        if (this.data.current + 1 < this.data.bgiQueue.length) {
          this.setData({ current: this.data.current + 1 });
        }
      } else if (this.data.bgiChange === -1 && this.data.current - 1 >= 0) {
        this.setData({ current: this.data.current - 1 });
      }
      wx.setStorageSync("bgiCurrent", this.data.current);
      this.setData({ bgiChange: 0 });
    }
  },
  createNote(res) {
    wx.redirectTo({ url: "../CreateNote/CreateNote" })
  },

  backToOverview(res) {
    this.setData({
      sw: "overview",
      title: null,
      text: null,
      playback: null,
      img: null,
      video: null
    });
    innerAudioContext.stop();
  },
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
  getVoiceInfo(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    innerAudioContext.autoplay = "true";
    innerAudioContext.src = this.data.playback[index].url;
    this.setData({ ["playback[" + index + "].opacity"]: 1 });
    var timeStamp = new Date().getTime();
    var flag = true;
    (function breathingEffection () {
      var playback = that.data.playback[index];
      if (playback.opacity > 1) flag = true;
      if (playback.opacity < 0.3) flag = false;
      setTimeout(() => {
        if (new Date().getTime() - timeStamp < playback.duration - 35) {
          if (flag) {
            that.setData({ ["playback[" + index + "].opacity"]: playback.opacity - 0.025 });
          } else that.setData({ ["playback[" + index + "].opacity"]: playback.opacity + 0.025 });
          breathingEffection();
        } else that.setData({ ["playback[" + index + "].opacity"]: 1 });
      }, 35)
    })();
  },
  getImageInfo(res) {
    var that = this;
    var index = res.currentTarget.id.match(/\d+/g)[0];
    function saveImage () {
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
        }else saveImage();
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
  getVideoInfo(res) {
    function saveVideo() {
      var that = this;
      wx.showModal({
        title: "读记事",
        content: "是否保存当前视频到本地？",
        success(res) {
          if (res.confirm) {
            wx.saveImageToPhotosAlbum({
              filePath: that.data.videoSrc,
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
      if (this.data.videoSrc) whichCanShow.push("video");
      this.whichCanShow = whichCanShow;
      anchor[2] = [res.touches[0].pageY, new Date().getTime()];
    }else if (res.type === "touchend" && this.tagB) {
      this.tagA = false;
      this.tagB = false;
      var moveDistance = (res.changedTouches[0].pageY - anchor[2][0]) * SWT;
      if (Math.abs(moveDistance) >= 187.5 && new Date().getTime() - anchor[2][1] < 2500) {
        var whichShowNow = this.whichShowNow;
        var whichCanShow = this.whichCanShow;
        var index = whichCanShow.indexOf(whichShowNow);
        if (moveDistance > 0) {
          if (index + 1 < whichCanShow.length) { //判断下一种记事类型是否存在
            this.setData({ sw: whichCanShow[index + 1] });
          } else {
            this.setData({
              sw: "overview",
              text: null,
              playback: null,
              img: null,
              videoSrc: null
            });
          }
        } else {
          if (index - 1 >= 0) { //判断上一种记事类型是否存在
            this.setData({ sw: whichCanShow[index - 1] });
          } else {
            this.setData({
              sw: "overview",
              text: null,
              playback: null,
              img: null,
              videoSrc: null
            });
          }
        }
      }
    }
  }

});