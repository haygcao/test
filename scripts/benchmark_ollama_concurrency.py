#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_ollama_concurrency.py
对 Ollama 在 GitHub Actions (2核 CPU) 上进行并发数梯度压测：[1, 2, 3]
彻底用数据验证 2 核 CPU 上的最佳并发线程数
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
CONCURRENCY_LEVELS = [1, 2, 3]  # 梯度压测并发数
TOTAL_TEST_CHUNKS_PER_RUN = 6   # 每个并发度压测固定跑 6 个批次（共 360 条）以控制测试总时长

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


async def translate_chunk_async(semaphore: asyncio.Semaphore, chunk_idx: int, chunk: dict) -> dict:
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
        log(f"   ⌛ [启动] 批次 {chunk_idx} 开始并发推理 ({len(chunk)} 条)...")
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
            log(f"   ✅ [完成] 批次 {chunk_idx} 耗时 {elapsed:.2f}s | 成功解析 {parsed_count} 条")
            return {"elapsed": elapsed, "parsed_count": parsed_count, "status": "SUCCESS"}
        except Exception as e:
            elapsed = time.time() - start_t
            log(f"   ❌ [失败] 批次 {chunk_idx} 耗时 {elapsed:.2f}s | 原因: {str(e)[:40]}")
            return {"elapsed": elapsed, "parsed_count": 0, "status": "FAILED"}


async def test_concurrency_level(concurrency: int, chunks: list) -> dict:
    log(f"\n=======================================================")
    log(f"🚀 开始压测：并发度 = {concurrency} (压测总样本: {len(chunks)} 批次)")
    log("=======================================================")

    semaphore = asyncio.Semaphore(concurrency)
    start_time = time.time()

    tasks = [translate_chunk_async(semaphore, i + 1, chunks[i]) for i in range(len(chunks))]
    results = await asyncio.gather(*tasks)

    total_elapsed = time.time() - start_time
    total_parsed = sum(r["parsed_count"] for r in results if r["status"] == "SUCCESS")
    speed = total_parsed / total_elapsed if total_elapsed > 0 else 0

    log(f"🏁 并发 {concurrency} 测试结束 -> 总耗时: {total_elapsed:.2f}s | 成功解析: {total_parsed} 条 | 吞吐率: {speed:.2f} 条/秒\n")

    return {
        "concurrency": concurrency,
        "elapsed": round(total_elapsed, 2),
        "parsed": total_parsed,
        "speed": round(speed, 2)
    }


async def run_benchmark():
    log("📦 正在装载基准语料并提取测试样本...")
    real_items = load_real_arb_items()
    items = list(real_items.items())

    # 准备固定数量的测试批次（6 批 x 60 条 = 360 条）
    test_chunks = []
    for i in range(0, TOTAL_TEST_CHUNKS_PER_RUN * CHUNK_SIZE, CHUNK_SIZE):
        test_chunks.append(dict(items[i:i + CHUNK_SIZE]))

    all_results = []
    for c in CONCURRENCY_LEVELS:
        # 重启服务注入不同的 OLLAMA_NUM_PARALLEL 变量
        log(f"🔄 正在配置 Ollama 服务以支持 {c} 并发...")
        os.system("pkill ollama || true")
        time.sleep(2)
        os.system(f"OLLAMA_NUM_PARALLEL={c} ollama serve &")
        time.sleep(5)

        # 执行该并发度下的全量跑批压测
        res = await test_concurrency_level(c, test_chunks)
        all_results.append(res)

    log("\n" + "=" * 70)
    log("             并发度 [1 vs 2 vs 3] 对比压测总结报告")
    log("=" * 70)
    log(f"{'并发数 (Threads)':<16} | {'总计耗时 (秒)':<14} | {'解析词条数':<12} | {'吞吐率 (条/秒)':<14}")
    log("-" * 70)

    best_speed = 0
    best_c = 0
    for r in all_results:
        log(f"{r['concurrency']:<16} | {r['elapsed']:<14} | {r['parsed']:<12} | {r['speed']:<14}")
        if r['speed'] > best_speed:
            best_speed = r['speed']
            best_c = r['concurrency']

    log("=" * 70)
    log(f"🎉 结论：在 GitHub Actions (2核) 上，最强吞吐量来自 [并发度 {best_c}]！")
    log("=" * 70)


def main():
    asyncio.run(run_benchmark())


if __name__ == "__main__":
    main()
