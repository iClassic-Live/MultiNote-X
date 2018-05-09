//关键词：自动渲染、开关控制渲染读写、使用ES6的proxy做深度代理
/*P.S.: 
    1. 使用该方法进行渲染会导致应用运行流畅度比主动调用setData进行渲染时稍有下降，
       若对应用运行流畅度有要求请不要使需要渲染的数据嵌套太深;
    2. 请尽量不要在引入本方法后再主动调用setData函数，以导致不必要的重复渲染;
    3. 由于代理渲染方法仍不完善：
        1) 请尽量不要使用会导致原数组改变的数组方法修改data数据;
        2) 请不要对data中的数组数据使用delete运算符删除元素 */
module.exports = {  //需要使用该方法时在相应页面的onLoad周期require然后赋值给this.data即可
  rendering(that) {  //that参数为调用该函数所在地的this
    //返回深度代理函数的立即执行结果
    return (function deepProxy(item, path, status) {
      status = "unset";
      if (item instanceof Object) {  //当item的数据类型为对象时
        if (item instanceof Array) {  //若item为数组则以数组方式对其属性进行遍历
          item.forEach((ele, index) => {
            item[index] = deepProxy(item[index], (() => {
              if (path !== undefined) {
                return path + "[" + index + "]";
              } else return index;
            })(), "unset");
          });
        } else {  //若item不为数组则以对象方式对其属性进行遍历
          for (let prop in item) {
            if (item.hasOwnProperty(prop)) {
              item[prop] = deepProxy(item[prop], (() => {
                if (path !== undefined) {
                  return path + "." + prop;
                } else return prop;
              })(), "unset");
            }
          }
        }
        return new Proxy(item, {  //返回为item订制的代理
          set(target, key, value, receiver) {  //当item的属性被读写时的操作
            let condition = item instanceof Array ? key === "length" ? false : true : true;
            if (status === "unset" && condition) {
              status = "setting"; //设定渲染状态为写入中
              that.setData({
              [(() => {  //渲染对应数据
                if (path !== undefined) {
                  if (item instanceof Array) {
                    return path + "[" + key + "]";
                  } else return path + "." + key;
                } else return key;
              })()]: value
              });
              //对新写入的数据进行深度代理
              value = deepProxy(value, (() => {
                if (path !== undefined) {
                  if (item instanceof Array) {
                    return path + "[" + key + "]";
                  } else return path + "." + key;
                } else return key;
              })(), "unset");
            } else if (status === "setting") status = "unset";  //复位渲染状态
            return Reflect.set(target, key, value, receiver);
          },
          deleteProperty(target, key) {  //当item属性被删除时的操作
            status = "deleting";  //设定渲染状态为删除中
            if (item instanceof Array) {  //当item为数组时
              item = item.slice(0, item.length - 1);  //排除被删除的无效元素
              if (path !== undefined) {
                that.setData({ [path]: item });
              } else that.setData(item);
              status = "unset";  //复位渲染状态
            } else {  //当item不是数组时
              (function loop() {
                setTimeout(() => {
                  if (!(key in item)) {  //当被删除的属性已不在item中时再执行渲染
                    if (path !== undefined) {
                      that.setData({ [path]: item });
                    } else that.setData({ [key]: null });
                    status = "unset";  //复位渲染状态
                  } else loop();  //当被删除的属性仍在item中时轮询等待
                })
              })()
            }
            return Reflect.deleteProperty(target, key);
          }
        });
      } else return item;
    })(that["data"]);
  }
}