const tsconfig = require('./tsconfig.json');

// Manually map tsconfig paths to moduleNameMapper format
const paths = tsconfig.compilerOptions.paths as Record<string, string[]>;
const moduleNameMapper: Record<string, string> = {};
for (const [key, values] of Object.entries(paths)) {
  const regexKey = `^${key.replace('*', '(.*)')}$`;
  moduleNameMapper[regexKey] = `<rootDir>/${values[0].replace('*', '$1')}`;
}

export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  moduleNameMapper,
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@scalar)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 30000,
  // Integration tests share a real DB — run sequentially to avoid connection pool exhaustion
  maxWorkers: 1,
  // Force exit after tests complete (BullMQ workers keep open handles)
  forceExit: true,
};
