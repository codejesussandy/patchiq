import { pathsToModuleNameMapper } from 'ts-jest';

const tsconfig = require('./tsconfig.json');

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
    '^.+\\.jsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: false,
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@scalar)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 30000,
  // Integration tests share a real DB — run sequentially to avoid connection pool exhaustion
  maxWorkers: 1,
};
