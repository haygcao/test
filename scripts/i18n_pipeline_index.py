#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_index.py
哔哩哔哩 Index-Translate 2B 全量 ARB 翻译管道
使用纯粹的 github-actions[bot] 机器人身份与权限
"""

import json
import os
import re
import sys
import time
import torch
from concurrent.futures import ThreadPoolExecutor, as_completed
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(2)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

MODEL_ID = "IndexTeam/Index-Translate-2B"
CHUNK_SIZE = 60
MAX_WORKERS = 4

model = None
tokenizer = None


def log(msg: str):
    print(f"[i18n-Pipeline-Index2B] {msg}", flush=True)


def git_checkpoint_commit_amend(target_locale: str):
    """在隔离进度分支上执行切换与 git commit --amend 增量保存，使用 github-actions[bot] 机器人身份"""
    try:
        os.system("git config user.name 'github-actions[bot]'")
        os.system("git config user.email '41898282+github-actions[bot]@users.noreply.github.com'")
        os.system("git checkout -B i18n/checkpoint-progress")
        os.system("git add lib/l10n/*.arb")

        commit_msg = f"style(i18n): checkpoint translation progress for {target_locale} [github-actions-bot]"
        ret = os.system(f"git commit --amend -m '{commit_msg}' || git commit -m '{commit_msg}'")

        if ret == 0:
            log(f"💾 [隔离分支增量落盘] 语言 `{target_locale}` 已成功在 i18n/checkpoint-progress 分支存盘！")
            os.system("git push --force origin HEAD:i18n/checkpoint-progress")
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


def process_language_task_index(target_locale: str, baseline_data: dict):
    arb_path = os.path.join(L10N_DIR, f"app_{target_locale}.arb")
    current_data = load_arb(arb_path)

    current_data = sanitize_and_deduplicate_arb(current_data)
    current_data = clean_obsolete_keys_from_target(current_data, set(baseline_data.keys()))

    valid_en_keys = {k: v for k, v in baseline_data.items() if not k.startswith("@") and k != "@@locale"}

    need_translation = {}
    for k, en_val in valid_en_keys.items():
        curr_val = current_data.get(k)
        if is_untranslated_value(en_val, curr_val):
            need_translation[k] = en_val

    if not need_translation:
        save_arb_with_fallback(arb_path, current_data, target_locale)
        log(f"✅ 语言 `{target_locale}` 数据完备。")
        return

    log(f"🌐 [Index-Translate 2B 并发] 语言 `{target_locale}` 开始翻译 {len(need_translation)} 个词条...")

    items = list(need_translation.items())
    total_chunks = (len(items) + CHUNK_SIZE - 1) // CHUNK_SIZE

    for i in range(0, len(items), CHUNK_SIZE):
        chunk = dict(items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [批次请求] 语言 `{target_locale}` 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条词条)...")

        try:
            translated_chunk = translate_chunk_with_index(chunk, target_locale)
            current_data.update(translated_chunk)

            final_data = {"@@locale": target_locale}
            for k in baseline_data.keys():
                if k in current_data:
                    final_data[k] = current_data[k]
                    meta_k = "@" + k
                    if meta_k in baseline_data:
                        final_data[meta_k] = baseline_data[meta_k]

            save_arb_with_fallback(arb_path, final_data, target_locale)
            log(f"   [批次落盘] `{target_locale}` 批次 {chunk_idx}/{total_chunks} 已写入磁盘！")

        except Exception as e:
            log(f"⚠️ `{target_locale}` 批次 {chunk_idx}/{total_chunks} 翻译异常: {e}")

    final_data = {"@@locale": target_locale}
    for k in baseline_data.keys():
        if k in current_data:
            final_data[k] = current_data[k]
            meta_k = "@" + k
            if meta_k in baseline_data:
                final_data[meta_k] = baseline_data[meta_k]
    save_arb_with_fallback(arb_path, final_data, target_locale)
    log(f"🎉 语言 `{target_locale}` 处理完毕！")

    git_checkpoint_commit_amend(target_locale)


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
    log(f"  Index-Translate 2B 4 线程并发全量 ARB 翻译管道")
    log("==========================================")

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
    log(f"🚀 [第二阶段] 开启 {MAX_WORKERS} 线程同时并发处理 {len(filtered_locales)} 个语言的翻译...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_language_task_index, locale, baseline_data): locale
            for locale in filtered_locales
        }
        for future in as_completed(futures):
            loc = futures[future]
            try:
                future.result()
                log(f"🎉 语言 `{loc}` 4 线程并发处理完成！")
            except Exception as e:
                log(f"❌ 语言 `{loc}` 并发处理异常: {e}")

    log("==========================================")
    log("✅ Index-Translate 2B 4 线程并发全量 ARB 翻译全套完成！")
    log("==========================================")


if __name__ == "__main__":
    main()
