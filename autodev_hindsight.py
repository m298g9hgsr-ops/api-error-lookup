#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
autodev_hindsight.py - 自主開發循環 + Hindsight 記憶層
"""

import os
import sys
import json
import re
import time
import signal
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
TASK_FILE = ROOT / "AUTODEV_TASKS.json"
STATE_FILE = ROOT / ".autodev_state.json"
LOG_FILE = ROOT / "autodev.log"
DIFF_PATCH = ROOT / ".autodev.patch"

HINDSIGHT_BASE = "http://localhost:8890"
OLLAMA_BASE = "http://localhost:11434"
OLLAMA_MODEL = "deepseek-coder:6.7b"
BANK_ID = "autodev"
POLL_SECONDS = 300

SYSTEM_PROMPT = """你是資深全端工程師。專案：Next.js 14 + TypeScript + Prisma + Tailwind + Ollama。
任務：根據 TODO 列表，直接修改代碼庫完成「一項」具體工作。
輸出：Unified Diff 格式（git apply 可直接套用）。
限制：
- 一次只做一個 TODO，完成即停
- 嚴格遵循現有代碼風格、類型定義、命名慣例
- 必須包含測試（Vitest/Jest）或至少手動驗證步驟
- 不要動 migration、不動 .env、不動 package.json 版本
- Diff 只包含 src/、tests/、prisma/schema.prisma
"""

def log(msg: str):
    line = f"[{datetime.now().isoformat()}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def run_cmd(cmd: str, cwd=None, check=True, timeout=120) -> subprocess.CompletedProcess:
    log(f"$ {cmd}")
    r = subprocess.run(cmd, shell=True, cwd=cwd or ROOT,
                       capture_output=True, text=True, timeout=timeout)
    if r.stdout:
        log(r.stdout.strip())
    if r.stderr:
        log(r.stderr.strip())
    if check and r.returncode != 0:
        raise RuntimeError(f"Command failed (exit {r.returncode}): {cmd}")
    return r

def load_tasks() -> list:
    if not TASK_FILE.exists():
        log(f"任務檔不存在：{TASK_FILE}")
        return []
    try:
        return json.loads(TASK_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        log(f"任務檔解析失敗：{e}")
        return []

def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"completed": [], "last_commit": ""}

def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

def h_api(path: str, method="GET", body=None, timeout=60):
    url = f"{HINDSIGHT_BASE}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            if not raw:
                return None
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        log(f"Hindsight HTTP {e.code}: {body_text[:300]}")
        return None
    except Exception as e:
        log(f"Hindsight 連線失敗：{e}")
        return None

def h_retain(content: str, observation=None, tags=None, context=None):
    payload = {"content": content, "bank_id": BANK_ID}
    if observation: payload["observation"] = observation
    if tags: payload["tags"] = tags
    if context: payload["context"] = context
    return h_api(f"/api/v1/banks/{BANK_ID}/retain", method="POST", body=payload)

def h_recall(query: str, top_k=5):
    payload = {"query": query, "top_k": top_k}
    resp = h_api(f"/api/v1/banks/{BANK_ID}/recall", method="POST", body=payload)
    if not resp: return []
    memories = resp.get("memories", resp.get("results", []))
    if isinstance(memories, list):
        return [m.get("content", str(m)) for m in memories]
    return [str(memories)]

def h_reflect(query: str, window="7d"):
    payload = {"query": query, "window": window}
    return h_api(f"/api/v1/banks/{BANK_ID}/reflect", method="POST", body=payload)

def h_health():
    return h_api("/healthz", method="GET")

def ollama_generate(prompt: str, temperature=0.1, num_ctx=8192) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "num_ctx": num_ctx}
    }
    url = f"{OLLAMA_BASE}/api/generate"
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            raw = resp.read().decode("utf-8")
            result = json.loads(raw)
            return result.get("response", "")
    except Exception as e:
        log(f"Ollama 呼叫失敗：{e}")
        raise

def generate_diff(task: dict, context_memories: list) -> str:
    context_block = "\n".join(context_memories) if context_memories else "（無相關歷史記憶）"
    prompt = f"""{SYSTEM_PROMPT}

## 相關歷史記憶（Hindsight Recall）
{context_block}

## 當前任務
ID：{task['id']}
標題：{task['title']}
細節：{task.get('detail', '')}
驗收標準：{task.get('acceptance', '功能正常、測試通過、TypeScript 編譯零錯誤')}

## 輸出格式要求（極重要 - 必須嚴格遵守）
**只輸出** 針對當前任務的真實 Unified Diff 純文字。

格式規則（逐行檢查）：
第1行：--- a/相對路徑
第2行：+++ b/相同相對路徑
第3行：@@ -舊起始行,舊行數 +新起始行,新行數 @@
第4行起：每行開頭必須是 - + 或空格

嚴禁事項：
- 絕對不要輸出 ```diff 或 ``` 或任何 markdown
- 絕對不要輸出任何說明文字

現在直接輸出 diff："""
    text = ollama_generate(prompt)
    diff = text.strip()
    if diff.startswith("```diff"):
        diff = diff[7:]
    if diff.endswith("```"):
        diff = diff[:-3]
    diff = diff.strip()
    if not diff.startswith("--- a/"):
        raise RuntimeError(f"模型未產出有效 Unified Diff（必須以 '--- a/' 開頭）：\n{diff[:200]}")
    return diff

def apply_diff(diff: str) -> bool:
    DIFF_PATCH.write_text(diff, encoding="utf-8")
    r = run_cmd(f"git apply --check {DIFF_PATCH}", check=False)
    if r.returncode != 0:
        log(f"Diff 無法套用：{r.stderr.strip()[:500]}")
        DIFF_PATCH.unlink(missing_ok=True)
        return False
    run_cmd(f"git apply {DIFF_PATCH}")
    DIFF_PATCH.unlink(missing_ok=True)
    return True

def run_tests() -> bool:
    ok = True
    r = run_cmd("pnpm typecheck", check=False, timeout=180)
    if r.returncode != 0:
        log("pnpm typecheck 失敗"); ok = False
    r = run_cmd("pnpm test", check=False, timeout=300)
    if r.returncode != 0:
        log("pnpm test 失敗"); ok = False
    return ok

def commit_changes(task_id: str):
    run_cmd("git add -A")
    run_cmd(f'git commit -m "autodev: {task_id}"')

def retain_experience(task: dict, result: dict):
    outcome = "success" if result.get("ok") else "failure"
    lesson = result.get("lesson", "")
    observation = task.get("detail", "")
    tags = [task["id"], outcome, "autodev"]
    content = (
        f"Task: {task['title']}\n"
        f"Outcome: {outcome}\n"
        f"Lesson: {lesson}\n"
        f"Diff applied: {result.get('applied', False)}\n"
        f"Tests passed: {result.get('tests_ok', False)}\n"
    )
    h_retain(content=content, observation=observation, tags=tags, context=observation)
    log(f"Hindsight retain 完成（{outcome}）")

def monday_morning_9am() -> bool:
    now = datetime.now()
    return now.weekday() == 0 and now.hour == 9

def main_loop():
    log("AutoDev + Hindsight 啟動")
    if not h_health():
        log("Hindsight Server 不可達，將繼續但不寫入記憶")
    signal.signal(signal.SIGINT, lambda *_: (log("收到中斷，退出"), sys.exit(0)))
    while True:
        tasks = load_tasks()
        state = load_state()
        pending = [t for t in tasks if t.get("id") not in state.get("completed", [])]
        if not pending:
            log("無待辦任務，睡眠 60 秒...")
            time.sleep(60)
            continue
        task = pending[0]
        task_id = task.get("id", "unknown")
        log(f"執行任務：{task_id} - {task.get('title', '')}")
        result = {"ok": False, "lesson": "", "applied": False, "tests_ok": False}
        try:
            query = f"{task.get('title','')} {task.get('detail','')}"
            memories = h_reca
