export const Redis = jest.fn().mockImplementation(() => ({
  pipeline: jest.fn().mockReturnValue({
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([null, 0]),
  }),
  del: jest.fn().mockResolvedValue(1),
}))