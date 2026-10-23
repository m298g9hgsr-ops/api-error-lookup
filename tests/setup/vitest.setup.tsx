import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables
// NOTE: vitest already sets NODE_ENV=test; do not overwrite it here.
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
process.env.DEFAULT_AI_MODEL = 'deepseek-coder:6.7b'
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079'
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token'

// Mock fetch globally
global.fetch = vi.fn()

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  analysis: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  plan: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  account: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  verificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  errorLog: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  quotaUsage: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((callback) => callback(mockPrismaClient)),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: vi.fn((opts) => ({
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    credentials: opts?.credentials ?? {},
    authorize: opts?.authorize ?? vi.fn(),
  })),
}))

vi.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    pipeline: vi.fn().mockReturnThis(),
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([null, 0]),
    del: vi.fn().mockResolvedValue(1),
  })),
}))

// Mock stripe
vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/test',
          id: 'cs_test',
          subscription: 'sub_test',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          data: [{
            id: 'si_test',
            price: { id: 'price_test', nickname: 'Pro Plan' }
          }],
        },
      }),
      cancel: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    prices: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    webhooks: {
      constructEvent: vi.fn().mockImplementation((payload, sig, secret) => {
        return JSON.parse(payload)
      }),
    },
  }))
  return { __esModule: true, default: StripeMock, Stripe: StripeMock }
})

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('hashed-password'),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockReturnValue(new Headers()),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options) => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn((options) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  })),
  QueryClient: vi.fn().mockImplementation(() => ({
    getQueryCache: vi.fn(),
    getMutationCache: vi.fn(),
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icons = [
    'Mail', 'Lock', 'Eye', 'EyeOff', 'User', 'Settings', 'LogOut', 'Menu',
    'X', 'ChevronDown', 'ChevronUp', 'Check', 'AlertCircle', 'Info',
    'CreditCard', 'RefreshCw', 'Trash2', 'Edit', 'Plus', 'Search',
    'Filter', 'Download', 'Upload', 'Copy', 'Link', 'ExternalLink',
    'Loader2', 'Home', 'Dashboard', 'History', 'BarChart', 'Shield',
    'Star', 'Zap', 'Cpu', 'Database', 'Server', 'Network', 'Terminal',
    'Code', 'Bug', 'AlertTriangle', 'HelpCircle', 'ChevronRight',
  ]
  
  const mockIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {}
  icons.forEach(name => {
    mockIcons[name] = vi.fn((props) => (
      <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />
    ))
  })
  
  return mockIcons
})

// Mock @radix-ui components
vi.mock('@radix-ui/react-slot', () => ({
  Slot: vi.fn(({ children }) => children),
}))

vi.mock('@radix-ui/react-tabs', () => ({
  Tabs: vi.fn(({ children }) => children),
  TabsList: vi.fn(({ children }) => <div data-testid="tabs-list">{children}</div>),
  TabsTrigger: vi.fn(({ children }) => <button data-testid="tabs-trigger">{children}</button>),
  TabsContent: vi.fn(({ children }) => <div data-testid="tabs-content">{children}</div>),
}))

vi.mock('@radix-ui/react-dialog', () => ({
  Dialog: vi.fn(({ children }) => children),
  DialogTrigger: vi.fn(({ children }) => children),
  DialogContent: vi.fn(({ children }) => <div data-testid="dialog-content">{children}</div>),
  DialogHeader: vi.fn(({ children }) => <div data-testid="dialog-header">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2 data-testid="dialog-title">{children}</h2>),
  DialogDescription: vi.fn(({ children }) => <p data-testid="dialog-description">{children}</p>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
  DialogClose: vi.fn(({ children }) => <button data-testid="dialog-close">{children}</button>),
}))

vi.mock('@radix-ui/react-dropdown-menu', () => ({
  DropdownMenu: vi.fn(({ children }) => children),
  DropdownMenuTrigger: vi.fn(({ children }) => children),
  DropdownMenuContent: vi.fn(({ children }) => <div data-testid="dropdown-menu-content">{children}</div>),
  DropdownMenuItem: vi.fn(({ children, onClick }) => (
    <button data-testid="dropdown-menu-item" onClick={onClick}>{children}</button>
  )),
  DropdownMenuSeparator: vi.fn(() => <hr data-testid="dropdown-menu-separator" />),
  DropdownMenuLabel: vi.fn(({ children }) => <span data-testid="dropdown-menu-label">{children}</span>),
}))

vi.mock('@radix-ui/react-toast', () => ({
  Toast: vi.fn(({ children }) => <div data-testid="toast">{children}</div>),
  ToastProvider: vi.fn(({ children }) => children),
  ToastViewport: vi.fn(({ children }) => <div data-testid="toast-viewport">{children}</div>),
  ToastTitle: vi.fn(({ children }) => <div data-testid="toast-title">{children}</div>),
  ToastDescription: vi.fn(({ children }) => <div data-testid="toast-description">{children}</div>),
  ToastClose: vi.fn(({ children }) => <button data-testid="toast-close">{children}</button>),
  ToastAction: vi.fn(({ children }) => <button data-testid="toast-action">{children}</button>),
}))

vi.mock('@radix-ui/react-tooltip', () => ({
  Tooltip: vi.fn(({ children }) => children),
  TooltipTrigger: vi.fn(({ children }) => children),
  TooltipContent: vi.fn(({ children }) => <div data-testid="tooltip-content">{children}</div>),
  TooltipProvider: vi.fn(({ children }) => children),
}))

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: vi.fn(({ children }) => <div data-testid="avatar">{children}</div>),
  AvatarImage: vi.fn(() => <img data-testid="avatar-image" />),
  AvatarFallback: vi.fn(({ children }) => <span data-testid="avatar-fallback">{children}</span>),
}))

// Mock clsx and tailwind-merge
vi.mock('clsx', () => ({
  clsx: vi.fn((...args) => args.filter(Boolean).join(' ')),
}))

vi.mock('tailwind-merge', () => ({
  twMerge: vi.fn((...args) => args.filter(Boolean).join(' ')),
}))

vi.mock('class-variance-authority', () => ({
  cva: vi.fn((base, config) => {
    const variants = config?.variants || {}
    const compoundVariants = config?.compoundVariants || []
    const defaultVariants = config?.defaultVariants || {}
    
    return (props: Record<string, unknown> = {}) => {
      let className = base
      
      Object.entries(variants).forEach(([key, variantConfig]) => {
        const value = props[key] || defaultVariants[key]
        if (value && variantConfig[value as string]) {
          className += ' ' + variantConfig[value as string]
        }
      })
      
      compoundVariants.forEach((cv) => {
        const matches = Object.entries(cv).every(([key, value]) => props[key] === value)
        if (matches && cv.className) {
          className += ' ' + cv.className
        }
      })
      
      return className
    }
  }),
}))

// Console suppress for tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    if (args[0]?.includes?.('act(...)')) return
    originalError.apply(console, args)
  }
  console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:')) return
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Clean up mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})

// Reset modules before each test
beforeEach(() => {
  vi.resetModules()
})