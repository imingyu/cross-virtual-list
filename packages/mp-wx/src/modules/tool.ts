import { selectBoundingClientRect } from 'cross-mp-power';
import type { CrossMpClientRect } from 'cross-mp-power';

/** 创建一个唯一的uuid */
export const uuid = (): string => {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        // tslint:disable-next-line:no-bitwise
        const r = (Math.random() * 16) | 0;
        // tslint:disable-next-line:no-bitwise
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const getBoundingClientRect = (
    vm: any,
    selector: string,
    retryCount = 3,
    delay = 100
): Promise<CrossMpClientRect> => {
    return new Promise((resolve, reject) => {
        const fire = () => {
            selectBoundingClientRect(selector, vm).then(resolve, (err) => {
                retryCount--;
                if (retryCount <= 0) {
                    return reject(err);
                }
                setTimeout(() => {
                    fire();
                }, delay);
            });
        };
        fire();
    });
};
