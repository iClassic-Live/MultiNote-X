//关键词：自动渲染、开关控制渲染读写、使用ES6的proxy做深度代理
/*P.S.: 
    1. 使用该方法进行渲染会导致应用运行流畅度比主动调用setData进行渲染时稍有下降，
       若对应用运行流畅度有要求请不要使需要渲染的数据嵌套太深;
    2. 请尽量不要在引入本方法后再主动调用setData函数，以导致不必要的重复渲染 */
module.exports = {  //需要使用该方法时在相应页面的onLoad周期require即可
  rendering(that) {  //that参数为调用该函数所在地的this
    //返回深度代理函数的立即执行结果
    return (function deepProxy(item, path, status) {
      status = true;
      if (item instanceof Object) {  //当item的数据类型为对象时
        if (item instanceof Array) {  //若item为数组则以数组方式对其属性进行遍历
          item.forEach((ele, index) => {
            item[index] = deepProxy(item[index], (() => {
              if (path !== undefined) {
                return path + "[" + index + "]";
              } else return index;
            })());
          }, true);
        } else {  //若item不为数组则以对象方式对其属性进行遍历
          for (let prop in item) {
            if (item.hasOwnProperty(prop)) {
              item[prop] = deepProxy(item[prop], (() => {
                if (path !== undefined) {
                  return path + "." + prop;
                } else return prop;
              })(), true);
            }
          }
        }
        return new Proxy(item, {  //返回为item订制的代理
          set(target, key, value, receiver) {  //当item的属性被读写时的操作
            let condition = !(item instanceof Array && key === "length"); //排除不需要渲染的属性
            if (condition) {
              if (status) {  //若渲染状态为未渲染
                status = false;  //设定渲染状态为渲染中
                target[key] = value;
                that.setData({ [(() => {
                  if (path !== undefined) {
                    if (item instanceof Array) {
                      return path + "[" + key + "]";
                    } else return path + "." + key;
                  } else return key;
                })()]: value }); //渲染对应数据
                //对新写入的数据进行深度代理
                value = deepProxy(value, (() => {
                  if (path !== undefined) {
                    if (item instanceof Array) {
                      return path + "[" + key + "]";
                    } else return path + "." + key;
                  } else return key;
                })(), true);
              }else if (!status) status = true;
            }
            return Reflect.set(target, key, value, receiver);
          },
          deleteProperty(target, key) {  //当item的属性被删除时的操作
            if (key in item) {
              status = false;  //设定渲染状态为渲染中
              if (path !== undefined) {
                if (item instanceof Array) {
                  item.splice(item.indexOf(item[key]), 1);
                } else delete item[key];
                that.setData({ [path]: item });
              } else that.setData(item);
            }
            return Reflect.deleteProperty(target, key);
          }
        });
      } else return item;
    })(that["data"]);
  }
}