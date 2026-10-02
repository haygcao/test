#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_ollama.py
读取真实 app_en.arb 真实长短词条，在 Ollama kaelri/hy-mt2:1.8b 上压测 [30, 50, 100, 200, 300, 500, 1000] 批次处理吞吐率与耗时
增加 sys.stdout.flush() 实时日志冲刷，防止 GitHub Actions 日志缓冲干等
"""

import json
import os
import sys
import time
from ollama import chat

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_ARB = os.path.join(PROJECT_ROOT, "lib", "l10n", "app_en.arb")
OLLAMA_MODEL = "kaelri/hy-mt2:1.8b"

BATCH_SIZES = [30, 50, 100, 200, 300, 500, 1000]


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


def test_batch_performance(batch_size: int, real_items: dict) -> dict:
    keys = list(real_items.keys())
    chunk = {k: real_items[k] for k in keys[:min(batch_size, len(keys))]}

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

    log(f"⌛ [正在请求 Ollama] 正在提交批次 [{batch_size} 条词条] 进行推理，请稍候...")
    start_time = time.time()

    try:
        response = chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            options={"num_predict": 4096, "temperature": 0.3}
        )
        elapsed = time.time() - start_time
        raw_text = response.message.content.strip()
        clean_json = raw_text.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(clean_json)
        parsed_count = len(parsed)
        speed = parsed_count / elapsed if elapsed > 0 else 0

        log(f"✅ [批次完成] 批次 [{batch_size} 条]: 耗时 {elapsed:.2f}s | 解析成功 {parsed_count} 条 | 吞吐率: {speed:.2f} 条/秒")
        return {
            "batch_size": batch_size,
            "elapsed_sec": round(elapsed, 2),
            "parsed_count": parsed_count,
            "items_per_sec": round(speed, 2),
            "status": "✅ 成功 (100% JSON 合规)",
        }

    except Exception as e:
        elapsed = time.time() - start_time
        log(f"❌ [批次异常] 批次 [{batch_size} 条]: 耗时 {elapsed:.2f}s | 失败原因: {e}")
        return {
            "batch_size": batch_size,
            "elapsed_sec": round(elapsed, 2),
            "parsed_count": 0,
            "items_per_sec": 0,
            "status": f"❌ 失败 ({str(e)[:40]})",
        }


def main():
    log("==========================================================")
    log("  Ollama (kaelri/hy-mt2:1.8b) 真实 ARB 词条批次吞吐率基准压测")
    log("==========================================================")

    real_items = load_real_arb_items()
    results = []

    for bs in BATCH_SIZES:
        log(f"\n🚀 开始压测批次大小: {bs} 条真实词条...")
        res = test_batch_performance(bs, real_items)
        results.append(res)
        time.sleep(1)

    log("\n" + "=" * 70)
    log("                    基准性能压测数据汇总报告")
    log("=" * 70)
    log(f"{'批次大小 (Batch)':<12} | {'消耗时间 (秒)':<14} | {'解析词条数':<12} | {'吞吐率 (条/秒)':<14} | {'状态':<20}")
    log("-" * 75)

    best_speed = 0
    best_batch = 0

    for r in results:
        log(f"{r['batch_size']:<12} | {r['elapsed_sec']:<14} | {r['parsed_count']:<12} | {r['items_per_sec']:<14} | {r['status']:<20}")
        if r['items_per_sec'] > best_speed:
            best_speed = r['items_per_sec']
            best_batch = r['batch_size']

    log("=" * 75)
    if best_batch > 0:
        log(f"🎉 最佳推荐性价比批次: [{best_batch} 条/批]，最高吞吐率达 {best_speed:.2f} 条/秒！")
    log("=" * 75)


if __name__ == "__main__":
    main()
