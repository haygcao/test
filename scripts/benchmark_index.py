#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/benchmark_index.py
哔哩哔哩最新开源 Index-Translate 2B (基于 Qwen3.5，支持 150+ 语言) 文本翻译模型基准压测
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
    log(f"  Bilibili Index-Translate 2B (Qwen3.5 150+语言) 基准压测")
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

    # 抽取前 60 个真实词条组包测试
    keys = list(real_items.keys())
    sample_chunk = {k: real_items[k] for k in keys[:60]}

    prompt = f"""Translate the values in the following JSON key-value pairs into Chinese. Note that you should only output the translated result without any additional explanation:

{json.dumps(sample_chunk, ensure_ascii=False)}"""

    messages = [{"role": "user", "content": prompt}]
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to(model.device)

    log("⌛ 正在提交 60 条真实 ARB 词条至 Index-Translate 2B 进行推理...")
    start_infer = time.time()

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=2048,
            do_sample=False
        )

    elapsed = time.time() - start_infer
    raw_output = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)

    log(f"⏱️ Index-Translate 2B 60条词条推理耗时: {elapsed:.2f} 秒 (吞吐率: {60 / elapsed:.2f} 条/秒)")
    log("=== Index-Translate 2B 翻译输出结果预览 ===")
    log(raw_output[:500] + "\n..." if len(raw_output) > 500 else raw_output)
    log("==========================================================")


if __name__ == "__main__":
    main()
