import { server } from '@/test/msw/node'
import { beforeAll, afterAll, afterEach } from 'vitest'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Clean up after each test
afterEach(() => server.resetHandlers())

// Close server after all tests
afterAll(() => server.close())