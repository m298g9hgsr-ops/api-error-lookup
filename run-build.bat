@echo off
cd /d C:\Users\aka21009lkk\Documents\deepseek-harness\default-workspace\pstack-project\api-error-lookup
npx next build > build-output.txt 2>&1
echo Exit code: %ERRORLEVEL%