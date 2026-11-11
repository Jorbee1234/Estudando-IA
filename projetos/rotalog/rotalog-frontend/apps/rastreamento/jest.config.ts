export default {
  displayName: 'rastreamento',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json', isolatedModules: true }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: { '\.css$': 'identity-obj-proxy' },
  testMatch: ['<rootDir>/src/**/*.spec.{ts,tsx}'],
  coverageDirectory: '../../coverage/apps/rastreamento',
  coverageThreshold: {
    './src/api/': { lines: 80 },
    './src/domain/': { lines: 80 },
    './src/hooks/': { lines: 80 },
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/test/**', '!src/**/*.spec.*'],
};
