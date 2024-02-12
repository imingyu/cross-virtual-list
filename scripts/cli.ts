import { buildPackage } from './build';

let [packageName] = process.argv.slice(2);
packageName = packageName || 'all';

const packageDesc = { all: '所有包', core: '核心包', 'mp-wx': '微信小程序包' }[packageName];

console.log('开始编译：' + packageDesc);
buildPackage(packageName as any)
    .then(() => {
        console.log('编译成功：' + packageDesc);
    })
    .catch((err) => {
        console.log('编译失败：' + packageDesc);
        console.error(err);
    });
