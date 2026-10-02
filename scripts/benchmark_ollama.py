#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_ollama.py
在 2 核 CPU 上对比 1 并发 vs 2 并发的实际翻译处理速度
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

CHUNK_SIZE = 60
CONCURRENCY_LEVELS = [1, 2]  # 对比 1 并发与 2 并发

client = AsyncClient()


def log(msg: str):
    print(msg, flush=True)


def load_real_arb_items() -> dict:
    if not os.path.exists(BASELINE_ARB):
        log(f"❌ 错误: 真实 ARB 基准文件 {BASELINE_ARB} 不存在！")
        sys.exit(1)

    with open(BASELINE_ARB, "r", encoding="utf-8") as f:
        data = json.load(f)

    real_items = {k: v for k, v in data.items() if not k.startswith("@") and k != "@@locale"}
    return real_items


async def translate_chunk_async(semaphore: asyncio.Semaphore, chunk_idx: int, total_chunks: int, chunk: dict) -> dict:
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
        log(f"   ⌛ [批次 {chunk_idx}/{total_chunks} 启动] 正在提交 ({len(chunk)} 条)...")
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
            log(f"   ✅ [批次 {chunk_idx}/{total_chunks} 完成] 耗时 {elapsed:.2f}s | 解析成功 {parsed_count} 条")
            return {"elapsed": elapsed, "parsed_count": parsed_count, "status": "SUCCESS"}
        except Exception as e:
            elapsed = time.time() - start_t
            log(f"   ❌ [批次 {chunk_idx}/{total_chunks} 失败] 耗时 {elapsed:.2f}s | 原因: {str(e)[:40]}")
            return {"elapsed": elapsed, "parsed_count": 0, "status": "FAILED"}


async def run_benchmark():
    log("==========================================================")
    log("  Ollama (kaelri/hy-mt2:1.8b) 1 并发 vs 2 并发性能对比")
    log("==========================================================")

    real_items = load_real_arb_items()
    items = list(real_items.items())

    # 截取前 600 条真实词条 (10 个 60 条批次) 进行对比测试
    sample_items = items[:600]
    chunks = []
    for i in range(0, len(sample_items), CHUNK_SIZE):
        chunks.append(dict(sample_items[i:i + CHUNK_SIZE]))

    total_chunks = len(chunks)

    all_results = []

    for concurrency in CONCURRENCY_LEVELS:
        log(f"\n🚀 开始测试并发度 = {concurrency} (测试 600 条真实词条, {total_chunks} 个批次)...")
        semaphore = asyncio.Semaphore(concurrency)
        start_time = time.time()

        tasks = [
            translate_chunk_async(semaphore, idx + 1, total_chunks, chunks[idx])
            for idx in range(total_chunks)
        ]

        results = await asyncio.gather(*tasks)

        total_elapsed = time.time() - start_time
        total_parsed = sum(r["parsed_count"] for r in results if r["status"] == "SUCCESS")
        speed = total_parsed / total_elapsed if total_elapsed > 0 else 0

        log(f"🏁 并发 {concurrency} 测试完成 -> 总耗时: {total_elapsed:.2f} 秒 | 成功解析: {total_parsed} 条 | 吞吐率: {speed:.2f} 条/秒")

        all_results.append({
            "concurrency": concurrency,
            "elapsed": round(total_elapsed, 2),
            "parsed": total_parsed,
            "speed": round(speed, 2)
        })

    log("\n" + "=" * 70)
    log("                  并发度 [1 并发 vs 2 并发] 汇总报告")
    log("=" * 70)
    log(f"{'并发度 (Concurrency)':<20} | {'总耗时 (秒)':<14} | {'解析词条数':<12} | {'吞吐率 (条/秒)':<14}")
    log("-" * 70)

    for r in all_results:
        log(f"{r['concurrency']:<20} | {r['elapsed']:<14} | {r['parsed']:<12} | {r['speed']:<14}")

    log("=" * 70)


def main():
    asyncio.run(run_benchmark())


if __name__ == "__main__":
    main()
