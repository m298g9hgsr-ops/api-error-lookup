@echo off
cd /d C:\Users\aka21009lkk\Documents\deepseek-harness\default-workspace\pstack-project\api-error-lookup
npx vitest run src/__tests__/quota.test.ts tests/integration/api/auth.test.ts tests/infrastructure.test.ts > vitest-output.txt 2>&1
echo Exit code: %ERRORLEVEL%