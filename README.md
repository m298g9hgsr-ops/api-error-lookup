# api-error-lookup

使用 pstack 建構的產品。

## 快速開始

```bash
# 安裝依賴
bun install

# 開發模式
bun run dev

# 建構
bun run build

# 測試
bun test
```

## pstack 工作流

```bash
# 1. 驗證想法
pstack validate "產品描述"

# 2. 規劃
pstack plan

# 3. 建構
# ... 開發 ...

# 4. 審查
pstack review
pstack qa

# 5. 出貨
pstack ship

# 6. 監控
pstack monitor

# 7. 反思
pstack reflect
```

## 部署

```bash
pstack setup-deploy  # 首次設定
pstack ship          # 部署
```

## 環境變數

複製 `.env.example` 為 `.env.local` 並填入值。

## 授權

MIT
