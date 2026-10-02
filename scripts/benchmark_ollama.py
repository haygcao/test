#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_ollama.py
在 Ollama (kaelri/hy-mt2:1.8b) 环境下，使用 60 条/批次 + 2 线程/协程并发，对真实 app_en.arb 进行吞吐率压测
"""

import asyncio
import json
import os
import sys
import time
from ollama import AsyncClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_ARB = os.path.join(PROJECT_ROOT, "lib", "l10n", "app_en.arb")
OLLAMA_MODEL = "kaelri/hy-mt2:1.8b"

CHUNK_SIZE = 60      # 每批次 60 条真实词条
MAX_CONCURRENCY = 2  # 2 线程/并发协程 (1:1 精确匹配 2 核 CPU)

client = AsyncClient()
semaphore = asyncio.Semaphore(MAX_CONCURRENCY)


def log(msg: str):
    print(msg, flush=True)


def load_real_arb_items() -> dict:
    if not os.path.exists(BASELINE_ARB):
        log(f"❌ 错误: 真实 ARB 基准文件 {BASELINE_ARB} 不存在！")
        sys.exit(1)

    with open(BASELINE_ARB, "r", encoding="utf-8") as f:
        data = json.load(f)

    real_items = {k: v for k, v in data.items() if not k.startswith("@") and k != "@@locale"}
    log(f"📦 成功载入真实 app_en.arb，共计 {len(real_items)} 个真实长短词条。")
    return real_items


async def translate_chunk_async(chunk_idx: int, total_chunks: int, chunk: dict) -> dict:
    prompt = f"""
You are a professional Flutter ARB translator.
Translate the values in the following JSON key-value pairs from English to target language 'zh_CN'.

Requirements:
1. Return strictly a raw valid JSON object starting with {{ and ending with }}.
2. Keep key names unchanged.
3. Keep placeholders like {{userName}}, {{count}}, {{hours}} unchanged.
4. Do NOT output any markdown formatting or extra explanation.

Input JSON:
{json.dumps(chunk, ensure_ascii=False)}
"""
    async with semaphore:
        log(f"⌛ [协程 {chunk_idx}/{total_chunks} 启动] 正在 2 线程并发提交批次 ({len(chunk)} 条词条)...")
        start_t = time.time()
        try:
            response = await client.chat(
                model=OLLAMA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                options={"num_predict": 4096, "temperature": 0.3}
            )
            elapsed = time.time() - start_t
            raw_text = response.message.content.strip()
            clean_json = raw_text.replace("```json", "").replace("```", "").strip()

            parsed = json.loads(clean_json)
            parsed_count = len(parsed)
            log(f"✅ [协程 {chunk_idx}/{total_chunks} 完成] 耗时 {elapsed:.2f}s | 解析成功 {parsed_count} 条")
            return {
                "chunk_idx": chunk_idx,
                "elapsed": elapsed,
                "parsed_count": parsed_count,
                "status": "SUCCESS"
            }
        except Exception as e:
            elapsed = time.time() - start_t
            log(f"❌ [协程 {chunk_idx}/{total_chunks} 失败] 耗时 {elapsed:.2f}s | 原因: {e}")
            return {
                "chunk_idx": chunk_idx,
                "elapsed": elapsed,
                "parsed_count": 0,
                "status": f"FAILED: {e}"
            }


async def run_benchmark():
    log("==========================================================")
    log("  Ollama 多线程并发压测 (60条/批 + 2 线程并发)")
    log("==========================================================")

    real_items = load_real_arb_items()
    items = list(real_items.items())

    # 将 1838 条词条按每批 60 条拆分
    chunks = []
    for i in range(0, len(items), CHUNK_SIZE):
        chunks.append(dict(items[i:i + CHUNK_SIZE]))

    total_chunks = len(chunks)
    log(f"🚀 将 {len(items)} 个真实词条拆分为 {total_chunks} 个批次 (每批 {CHUNK_SIZE} 条)，开启 2 线程并发压测...")

    total_start_time = time.time()

    tasks = [
        translate_chunk_async(idx + 1, total_chunks, chunks[idx])
        for idx in range(total_chunks)
    ]

    results = await asyncio.gather(*tasks)

    total_elapsed = time.time() - total_start_time
    total_parsed = sum(r["parsed_count"] for r in results if r["status"] == "SUCCESS")
    overall_speed = total_parsed / total_elapsed if total_elapsed > 0 else 0

    log("\n" + "=" * 70)
    log("                    2 线程并发压测数据汇总报告")
    log("=" * 70)
    log(f"配置架构         : 每批 {CHUNK_SIZE} 条 | 2 线程并发")
    log(f"总计成功解析词条 : {total_parsed} / {len(items)} 条")
    log(f"并发总计耗时     : {total_elapsed:.2f} 秒 ({total_elapsed / 60:.2f} 分钟)")
    log(f"综合并发吞吐率   : {overall_speed:.2f} 条/秒")
    log("=" * 70)


def main():
    asyncio.run(run_benchmark())


if __name__ == "__main__":
    main()
