module.exports = {
    '*.js': ['eslint'],
    'scripts/**/*.ts': ['eslint', 'tsc --esModuleInterop --skipLibCheck --noEmit'],
    'packages/types/src/**/*.ts': ['eslint', 'tsc --esModuleInterop --skipLibCheck --noEmit'],
    'packages/core/src/**/*.ts': ['eslint', 'tsc --esModuleInterop --skipLibCheck --noEmit'],
    'packages/mp-wx/src/**/*.ts': ['eslint', 'tsc --esModuleInterop --skipLibCheck --noEmit ./packages/mp-wx/wx.d.ts']
};
