#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_index.py
哔哩哔哩 Index-Translate 2B (Qwen3.5) 2 线程 vs 4 线程 PyTorch CPU 压测脚本
严格按照 60 条/批 (CHUNK_SIZE = 60) 进行实测对比
"""

import json
import os
import sys
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_ARB = os.path.join(PROJECT_ROOT, "lib", "l10n", "app_en.arb")
MODEL_ID = "IndexTeam/Index-Translate-2B"
CHUNK_SIZE = 60  # 严格锁定 60 条/批


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


def main():
    log("==========================================================")
    log("  Index-Translate 2B 压测：2 线程 vs 4 线程 (60条/批)")
    log("==========================================================")

    log(f"📦 正在载入 Index-Translate 2B 模型: {MODEL_ID}...")
    start_load = time.time()

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        device_map="cpu",
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )
    model.eval()
    log(f"✅ 模型载入成功！耗时 {time.time() - start_load:.2f}s")

    real_items = load_real_arb_items()
    items = list(real_items.items())

    # 截取前 360 条 (6 个 60条批次) 进行 2 线程 vs 4 线程对比测试
    sample_items = items[:360]
    chunks = []
    for i in range(0, len(sample_items), CHUNK_SIZE):
        chunks.append(dict(sample_items[i:i + CHUNK_SIZE]))

    thread_levels = [2, 4]
    results = []

    for num_threads in thread_levels:
        log(f"\n🚀 开始压测：PyTorch CPU 线程数 = {num_threads} (测试 360 条真实词条, {len(chunks)} 个批次)...")
        torch.set_num_threads(num_threads)
        start_t = time.time()
        parsed_total = 0

        for idx, chunk in enumerate(chunks, 1):
            prompt = f"Translate the values in the following JSON key-value pairs into Chinese. Note that you should only output the translated result without any additional explanation:\n\n{json.dumps(chunk, ensure_ascii=False)}"
            messages = [{"role": "user", "content": prompt}]
            inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)

            log(f"   ⌛ [线程数 {num_threads} | 批次 {idx}/{len(chunks)}] 正在推理 60 条词条...")
            chunk_start = time.time()

            with torch.no_grad():
                outputs = model.generate(**inputs, max_new_tokens=2048, do_sample=False)

            elapsed_chunk = time.time() - chunk_start
            raw_output = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
            clean_json = raw_output.replace("```json", "").replace("```", "").strip()

            try:
                parsed = json.loads(clean_json)
                parsed_total += len(parsed)
                log(f"   ✅ [批次 {idx}/{len(chunks)} 完成] 耗时 {elapsed_chunk:.2f}s | 成功解析 {len(parsed)} 条")
            except Exception as e:
                log(f"   ❌ [批次 {idx}/{len(chunks)} 失败] 耗时 {elapsed_chunk:.2f}s | 原因: {e}")

        total_elapsed = time.time() - start_t
        speed = parsed_total / total_elapsed if total_elapsed > 0 else 0
        log(f"🏁 线程数 {num_threads} 压测结束 -> 总耗时: {total_elapsed:.2f}s | 成功解析: {parsed_total} 条 | 吞吐率: {speed:.2f} 条/秒")

        results.append({
            "threads": num_threads,
            "elapsed": round(total_elapsed, 2),
            "parsed": parsed_total,
            "speed": round(speed, 2)
        })

    log("\n" + "=" * 70)
    log("             Index-Translate 2B [2 线程 vs 4 线程] 压测对比报告")
    log("=" * 70)
    log(f"{'线程数 (Threads)':<16} | {'总耗时 (秒)':<14} | {'解析词条数':<12} | {'吞吐率 (条/秒)':<14}")
    log("-" * 70)

    best_speed = 0
    best_t = 0
    for r in results:
        log(f"{r['threads']:<16} | {r['elapsed']:<14} | {r['parsed']:<12} | {r['speed']:<14}")
        if r['speed'] > best_speed:
            best_speed = r['speed']
            best_t = r['threads']

    log("=" * 70)
    if best_t > 0:
        log(f"🎉 结论：Index-Translate 2B 最强吞吐性能来自 [PyTorch {best_t} 线程]！")
    log("=" * 70)


if __name__ == "__main__":
    main()
