//关键词：自动渲染、开关控制渲染读写、使用ES6的proxy做深度代理
/*P.S.: 
    1. 使用该方法进行渲染会导致应用运行流畅度比主动调用setData进行渲染时稍有下降，
       若对应用运行流畅度有要求请不要使需要渲染的数据嵌套太深;
    2. 请尽量不要在引入本方法后再主动调用setData函数，以导致不必要的重复渲染; */
module.exports = {  //需要使用该方法时在相应页面的onLoad周期require然后赋值给this.data即可
  rendering() {  //this参数为调用该函数所在地的this
    //返回深度代理函数的立即执行结果
    return (function deepProxy(item, path, status) {  //参数分别为当前对象、当前路径、当前渲染状态
      //渲染路径生成器
      function pathCreater(target, way, key) {  //参数分别为属性key的父级对象的数据类型、当前路径、当前属性名
        if (way !== undefined) {
          if (target instanceof Array && key !== "length") {
            return way + "[" + key + "]";
          } else return way + "." + key;
        } else return key;
      }
      //渲染状态阵列生成器
      function statusCreater(target) {  //参数为当前对象
        if (target instanceof Object) {
          let statusQueue = new Object();
          if (target instanceof Array) {
            target.forEach((ele, index) => { status[index] = "unset" });
          } else for (let prop in target) statusQueue[prop] = "unset";
          return statusQueue;
        } else return "root";  //根属性，渲染状态由父级对象的渲染状态阵列控制
      }
      status = statusCreater(item);
      if (item instanceof Object) {  //当item的数据类型为对象时
        if (item instanceof Array) {  //若item为数组则以数组方式对其属性进行遍历
          item.forEach((ele, index) => {
            let args = [item[index], pathCreater(item, path, index), statusCreater(item[index])];
            item[index] = deepProxy.apply(this, args);
          });
        } else {  //若item不为数组则以对象方式对其属性进行遍历
          for (let prop in item) {
            let args = [item[prop], pathCreater(item, path, prop), statusCreater(item[prop])];
            item[prop] = deepProxy.apply(this, args);
          }
        }
        return new Proxy(item, {  //返回为item订制的代理
          get: (target, key, receiver) => {
            if (item instanceof Array) {
              //重写所有在执行时可能会多次改变自身的数组方法以防止渲染出错
              let exception = ["unshift", "sort", "splice", "reverse", "forEach"];
              let condition = exception.some(ele => { return key === ele });
              if (condition && item[key] === Array.prototype[key]) {
                let that = this;
                item[key] = function () {
                  let buffer = this.map(ele => { return ele });
                  let value = buffer[key](...arguments);
                  that.setData({ [path]: buffer });
                  return value;
                }
              }
            }
            return Reflect.get(target, key, receiver);
          },
          set: (target, key, value, receiver) => {  //当item的属性被读写时的操作
            //排除会导致渲染出错的情况
            let condition = item instanceof Array ? key === "length" ? false : true : true;
            if (status[key] === undefined && condition) {
              status[key] = "unset";  //若当前属性的渲染状态为空则设定状态
            }
            if (status[key] === "unset" && condition) {  //若当前渲染状态为待渲染
              status[key] = "setting";  //设定渲染状态为渲染中
              this.setData({ [pathCreater(item, path, key)]: value });  //渲染对应数据
              //对新写入的数据进行深度代理
              let args = [value, pathCreater(item, path, key), statusCreater(value)]
              value = deepProxy.apply(this, args);
            } else if (status[key] === "setting") status[key] = "unset";
            return Reflect.set(target, key, value, receiver)
          },
          deleteProperty:(target, key) => {
            delete item[key];
            if (path !== undefined) {
              this.setData({ [path]: item });
            } else this.setData({ [key]: null });
            //删除渲染状态阵列中无效的子项
            if (item instanceof Array) {
              delete status[item.length - 1];
            }else delete status[key];
            return Reflect.deleteProperty(target, key);
          }
        });
      } else return item;
    }).call(this, this["data"]);
  }
}