#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_index.py
哔哩哔哩 Index-Translate 2B (Qwen3.5 150+语言) 动态 4 线程 600 条拆分与自适应负载降级翻译管道
"""

import json
import os
import re
import sys
import time
import torch
import psutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(2)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

MODEL_ID = "IndexTeam/Index-Translate-2B"
CHUNK_SIZE = 60         # 60 条推理批次
SUBTASK_MAX_SIZE = 600 # 大语言拆分为最多 600 条子任务
MAX_WORKERS = 4        # 默认 4 线程并发

model = None
tokenizer = None
file_lock = Lock()


def log(msg: str):
    print(f"[i18n-Pipeline-Index2B] {msg}", flush=True)


def check_system_load_and_throttle():
    """监测 RAM 内存使用率，若 > 85% 则暂停休眠放缓算力"""
    try:
        mem_percent = psutil.virtual_memory().percent
        if mem_percent > 85.0:
            log(f"⚠️ [负载管控] 当前内存使用率高达 {mem_percent}%，暂停 3 秒避开峰值...")
            time.sleep(3)
    except Exception:
        pass


def git_checkpoint_commit_amend(target_locale: str):
    """在隔离进度分支上执行切换与 git commit --amend 增量保存"""
    with file_lock:
        try:
            token = os.environ.get("GITHUB_TOKEN", "").strip()
            repository = os.environ.get("GITHUB_REPOSITORY", "").strip()

            os.system("git config user.name 'github-actions[bot]'")
            os.system("git config user.email '41898282+github-actions[bot]@users.noreply.github.com'")
            os.system("git checkout -B i18n/checkpoint-progress")
            os.system("git add lib/l10n/*.arb")

            commit_msg = f"style(i18n): checkpoint translation progress for {target_locale} [github-actions-bot]"
            ret = os.system(f"git commit --amend -m '{commit_msg}' || git commit -m '{commit_msg}'")

            if ret == 0 and token and repository:
                log(f"💾 [隔离分支增量落盘] 语言 `{target_locale}` 阶段进度已成功在 i18n/checkpoint-progress 分支存盘！")
                push_url = f"https://x-access-token:{token}@github.com/{repository}.git"
                os.system(f"git push --force {push_url} i18n/checkpoint-progress > /dev/null 2>&1")
        except Exception as e:
            log(f"⚠️ 隔离分支增量存盘提示: {e}")


def init_index_model():
    """载入 Index-Translate 2B 模型与分词器"""
    global model, tokenizer
    log(f"📦 正在载入 Index-Translate 2B 模型: {MODEL_ID}...")
    start_time = time.time()

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        device_map="cpu",
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )
    model.eval()
    log(f"✅ Index-Translate 2B 模型载入成功！耗时 {time.time() - start_time:.2f}s")


def translate_chunk_with_index(chunk: dict, target_lang: str) -> dict:
    prompt = f"""Translate the values in the following JSON key-value pairs from English into target language '{target_lang}'. Note that you should only output the translated result without any additional explanation:

{json.dumps(chunk, ensure_ascii=False)}"""

    messages = [{"role": "user", "content": prompt}]
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        return_tensors="pt"
    ).to(model.device)

    max_retries = 2
    for attempt in range(1, max_retries + 1):
        try:
            check_system_load_and_throttle()
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=2048,
                    do_sample=False
                )
            raw_text = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
            clean_json = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        except Exception as e:
            if attempt < max_retries:
                time.sleep(1)
            else:
                raise e


def load_arb(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_arb_with_fallback(path: str, data: dict, target_locale: str):
    with file_lock:
        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        if "_" in target_locale:
            base_lang = target_locale.split("_")[0]
            base_arb_path = os.path.join(L10N_DIR, f"app_{base_lang}.arb")
            if not os.path.exists(base_arb_path):
                base_data = dict(data)
                base_data["@@locale"] = base_lang
                with open(base_arb_path, "w", encoding="utf-8") as f:
                    json.dump(base_data, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                log(f"💡 自动生成 Base Fallback 文件: app_{base_lang}.arb")


def sanitize_and_deduplicate_arb(data: dict) -> dict:
    sanitized = {}
    for k, v in data.items():
        if k in sanitized:
            if v and not sanitized[k]:
                sanitized[k] = v
        else:
            sanitized[k] = v
    return sanitized


def clean_obsolete_keys_from_target(target_data: dict, baseline_keys: set) -> dict:
    cleaned = {}
    if "@@locale" in target_data:
        cleaned["@@locale"] = target_data["@@locale"]
    for k, v in target_data.items():
        if k in baseline_keys or k.startswith("@"):
            cleaned[k] = v
    return cleaned


def is_untranslated_value(en_val: str, target_val: str) -> bool:
    if not target_val or not str(target_val).strip():
        return True
    if en_val == target_val and len(en_val) > 3:
        if re.search(r"[a-zA-Z]", en_val):
            return True
    return False


def process_subtask_index(subtask_id: str, target_locale: str, sub_items: list, baseline_data: dict):
    """处理不超过 600 条词条的子任务，完成后立刻落盘存盘"""
    arb_path = os.path.join(L10N_DIR, f"app_{target_locale}.arb")

    with file_lock:
        current_data = load_arb(arb_path)
        current_data = sanitize_and_deduplicate_arb(current_data)
        current_data = clean_obsolete_keys_from_target(current_data, set(baseline_data.keys()))

    chunk_map = dict(sub_items)
    total_chunks = (len(sub_items) + CHUNK_SIZE - 1) // CHUNK_SIZE
    log(f"🌐 [子任务 {subtask_id}] 开始处理 {len(sub_items)} 个词条 (共 {total_chunks} 批)...")

    for i in range(0, len(sub_items), CHUNK_SIZE):
        chunk = dict(sub_items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [批次请求] 子任务 `{subtask_id}` 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条)...")

        try:
            translated_chunk = translate_chunk_with_index(chunk, target_locale)
            with file_lock:
                current_data.update(translated_chunk)
                final_data = {"@@locale": target_locale}
                for k in baseline_data.keys():
                    if k in current_data:
                        final_data[k] = current_data[k]
                        meta_k = "@" + k
                        if meta_k in baseline_data:
                            final_data[meta_k] = baseline_data[meta_k]
                save_arb_with_fallback(arb_path, final_data, target_locale)
                log(f"   [批次落盘] `{subtask_id}` 批次 {chunk_idx}/{total_chunks} 已写入磁盘！")
        except Exception as e:
            log(f"⚠️ `{subtask_id}` 批次 {chunk_idx}/{total_chunks} 翻译异常: {e}")

    # 子任务完成，即刻触发隔离分支增量 commit & push 强推
    git_checkpoint_commit_amend(target_locale)
    log(f"🎉 子任务 `{subtask_id}` 全套落盘与存盘完成！")


def parse_target_locales_from_dart(file_path: str) -> list[str]:
    locales = set()
    if not os.path.exists(file_path):
        return list(locales)

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(r"Locale\s*\(\s*['\"]([a-zA-Z]+)['\"](?:\s*,\s*['\"]([a-zA-Z]+)['\"])?\s*\)")
    for match in pattern.finditer(content):
        lang = match.group(1)
        country = match.group(2)
        locales.add(f"{lang}_{country}" if country else lang)

    return sorted(locales)


def main():
    log("==========================================")
    log(f"  Index-Translate 2B 600条平滑切分与自适应降级管道")
    log("==========================================")

    # 1. 静态代码级扫描清理
    try:
        from i18n_cleaner import compute_safe_keys_to_remove, apply_cleanup
        log("🧹 [第一阶段] 启动静态代码调用分析与未使用词条安全清理...")
        safe_remove_set, confirmed_used, text_appeared = compute_safe_keys_to_remove()
        if safe_remove_set:
            log(f"   检测到 {len(safe_remove_set)} 个未引用的安全可删词条，执行全语言 ARB 剔除...")
            apply_cleanup(safe_remove_set, do_backup=False)
            log("   ✅ 静态清理完成！")
        else:
            log("   ✅ 未检测到无用词条，无需剔除。")
    except Exception as e:
        log(f"⚠️ 静态清理阶段跳过/警告: {e}")

    init_index_model()

    baseline_data = load_arb(BASELINE_ARB)
    if not baseline_data:
        log(f"❌ 错误: 基准文件 {BASELINE_ARB} 不存在！")
        sys.exit(1)

    baseline_data = sanitize_and_deduplicate_arb(baseline_data)
    save_arb_with_fallback(BASELINE_ARB, baseline_data, "en")

    target_locales = parse_target_locales_from_dart(LANG_DATA_FILE)
    if not target_locales:
        log("⚠️ 未解析到语言配置。")
        sys.exit(0)

    filtered_locales = [loc for loc in target_locales if not loc.startswith("en")]

    # 生成 600 条平滑切分的子任务队列 (Sub-Tasks)
    subtasks = []
    valid_en_keys = {k: v for k, v in baseline_data.items() if not k.startswith("@") and k != "@@locale"}

    for locale in filtered_locales:
        arb_path = os.path.join(L10N_DIR, f"app_{locale}.arb")
        current_data = load_arb(arb_path)
        need_items = []
        for k, en_val in valid_en_keys.items():
            curr_val = current_data.get(k)
            if is_untranslated_value(en_val, curr_val):
                need_items.append((k, en_val))

        if not need_items:
            save_arb_with_fallback(arb_path, current_data, locale)
            log(f"✅ 语言 `{locale}` 数据完备。")
            continue

        # 按 SUBTASK_MAX_SIZE (600条) 切分子任务
        sub_count = (len(need_items) + SUBTASK_MAX_SIZE - 1) // SUBTASK_MAX_SIZE
        for s_idx in range(sub_count):
            part_items = need_items[s_idx * SUBTASK_MAX_SIZE: (s_idx + 1) * SUBTASK_MAX_SIZE]
            subtask_id = f"{locale}_part{s_idx + 1}" if sub_count > 1 else locale
            subtasks.append((subtask_id, locale, part_items))

    log(f"🚀 [第二阶段] 全局生成 {len(subtasks)} 个平滑子任务 (最多600条/任务)，开启 {MAX_WORKERS} 线程池调度...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_subtask_index, sub_id, loc, part_items, baseline_data): sub_id
            for sub_id, loc, part_items in subtasks
        }
        for future in as_completed(futures):
            sub_id = futures[future]
            try:
                future.result()
                log(f"🎉 子任务 `{sub_id}` 处理完成！")
            except Exception as e:
                log(f"❌ 子任务 `{sub_id}` 处理异常: {e}")

    log("==========================================")
    log("✅ Index-Translate 2B 600条切分全量 ARB 翻译管道顺利完成！")
    log("==========================================")


if __name__ == "__main__":
    main()
