import type { MpClientRect } from '@cross-virtual-list/types';

export const getBoundingClientRect = (
    vm: any,
    selector: string,
    retryCount = 3,
    delay = 100
): Promise<MpClientRect> => {
    return new Promise((resolve, reject) => {
        const fire = () => {
            vm.createSelectorQuery()
                .select(selector)
                .boundingClientRect()
                .exec((res) => {
                    if (res?.[0] && 'height' in res[0]) {
                        resolve(res[0]);
                    } else {
                        retryCount--;
                        if (retryCount <= 0) {
                            const err = new Error(`无法找到元素${selector}进而获取其boundingClientRect`);
                            return reject(err);
                        }
                        setTimeout(() => {
                            fire();
                        }, delay);
                    }
                });
        };
        fire();
    });
};
