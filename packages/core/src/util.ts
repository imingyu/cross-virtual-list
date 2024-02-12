export const each = <T = any>(list: T[], handler: (item: T, index: number) => any) => {
    const len = list.length;
    for (let i = 0; i < len; i++) {
        if (handler(list[i], i) === false) {
            break;
        }
    }
};
