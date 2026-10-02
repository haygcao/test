#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_index.py
哔哩哔哩最新开源 Index-Translate 2B (Qwen3.5 150+语言) 原生 PyTorch 极速基准压测
使用 PyTorch 原生 C++ CPU 线程池 (torch.set_num_threads=2)，杜绝多线程 GIL 锁死冲突
"""

import json
import os
import sys
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# 设置 PyTorch 底层 C++ CPU 线程数 (匹配 GitHub Actions 2核 CPU)
torch.set_num_threads(2)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_ARB = os.path.join(PROJECT_ROOT, "lib", "l10n", "app_en.arb")
MODEL_ID = "IndexTeam/Index-Translate-2B"
CHUNK_SIZE = 50  # 50 条黄金批次


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
    log(f"  Index-Translate 2B (Qwen3.5 150+语言) 原生 PyTorch 极速基准压测")
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
    log(f"✅ Index-Translate 2B 模型载入成功！耗时 {time.time() - start_load:.2f}s")

    real_items = load_real_arb_items()
    items = list(real_items.items())

    chunks = []
    for i in range(0, len(items), CHUNK_SIZE):
        chunks.append(dict(items[i:i + CHUNK_SIZE]))

    total_chunks = len(chunks)
    log(f"🚀 将 {len(items)} 个真实词条拆分为 {total_chunks} 个批次 (每批 {CHUNK_SIZE} 条)，启动 PyTorch 原生 CPU 推理...")

    total_start_time = time.time()
    total_parsed = 0

    for idx, chunk in enumerate(chunks, 1):
        prompt = f"""Translate the values in the following JSON key-value pairs into Chinese. Note that you should only output the translated result without any additional explanation:

{json.dumps(chunk, ensure_ascii=False)}"""

        messages = [{"role": "user", "content": prompt}]
        inputs = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            return_tensors="pt"
        ).to(model.device)

        log(f"⌛ [批次 {idx}/{total_chunks} 启动] 正在提交 {len(chunk)} 条词条进行 Index-2B 推理...")
        start_t = time.time()

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=2048,
                do_sample=False
            )

        elapsed = time.time() - start_t
        raw_output = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
        clean_json = raw_output.replace("```json", "").replace("```", "").strip()

        try:
            parsed = json.loads(clean_json)
            parsed_count = len(parsed)
            total_parsed += parsed_count
            log(f"✅ [批次 {idx}/{total_chunks} 完成] 耗时 {elapsed:.2f}s | 成功解析 {parsed_count} 条 (吞吐率: {parsed_count / elapsed:.2f} 条/秒)")
        except Exception as e:
            log(f"❌ [批次 {idx}/{total_chunks} 失败] 耗时 {elapsed:.2f}s | 原因: {e}")

    total_elapsed = time.time() - total_start_time
    overall_speed = total_parsed / total_elapsed if total_elapsed > 0 else 0

    log("\n" + "=" * 70)
    log("          Index-Translate 2B 原生 PyTorch 压测数据汇总报告")
    log("=" * 70)
    log(f"配置架构         : 每批 {CHUNK_SIZE} 条 | PyTorch 原生 CPU 线程 (torch.set_num_threads=2)")
    log(f"总计成功解析词条 : {total_parsed} / {len(items)} 条")
    log(f"总计耗时         : {total_elapsed:.2f} 秒 ({total_elapsed / 60:.2f} 分钟)")
    log(f"综合吞吐率       : {overall_speed:.2f} 条/秒")
    log("=" * 70)


if __name__ == "__main__":
    main()
