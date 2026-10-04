#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_ollama.py
在测试仓库 C:/Users/Ngokel/Desktop/en/example/test 中通过 Ollama kaelri/hy-mt2:1.8b 执行全量 ARB 检修与翻译脚本
包含 600 条平滑子任务切分、动态负载管控与即时 Commit 强推
"""

import json
import os
import re
import sys
import time
import psutil
from threading import Lock
from concurrent.futures import ThreadPoolExecutor, as_completed
from ollama import chat

# ============ 路径与模型配置 ============
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

OLLAMA_MODEL = "kaelri/hy-mt2:1.8b"
CHUNK_SIZE = 60         # 60 条推理批次
SUBTASK_MAX_SIZE = 600 # 600 条子任务切分上限
MAX_WORKERS = 4        # 4 线程并发

HYMT2_SUPPORTED_LANGUAGES = {
    "zh", "zh_CN", "zh_TW", "zh_HK", "zh_MO", "yue",
    "en", "en_US", "en_GB",
    "fr", "pt", "es", "ja", "tr", "ru", "ar", "ko", "th", "it", "de", "vi", "ms", "id",
    "tl", "fil", "hi", "pl", "cs", "nl", "km", "my", "fa", "gu", "ur", "te", "mr",
    "he", "bn", "ta", "uk", "bo", "kk", "mn", "ug",
    "af", "af_ZA", "nb", "no", "sv", "da"
}

LOCALE_NAME_MAP = {
    "af": "Dutch (Afrikaans)",
    "af_ZA": "Dutch (Afrikaans)",
    "nb": "Norwegian",
    "no": "Norwegian",
    "sv": "Swedish",
    "da": "Danish",
}

file_lock = Lock()


def log(msg: str):
    print(f"[i18n-Pipeline-Ollama] {msg}", flush=True)


def check_system_load_and_throttle():
    """监测系统 RAM，当 > 85% 时自动休眠避开峰值"""
    try:
        mem_percent = psutil.virtual_memory().percent
        if mem_percent > 85.0:
            log(f"⚠️ [负载管控] 当前内存使用率高达 {mem_percent}%，休眠 3 秒保护系统...")
            time.sleep(3)
    except Exception:
        pass


def git_checkpoint_commit_amend(target_locale: str):
    """在隔离进度分支上执行 git commit --amend 增量保存"""
    with file_lock:
        try:
            token = os.environ.get("GITHUB_TOKEN", "").strip()
            repository = os.environ.get("GITHUB_REPOSITORY", "").strip()

            os.system("git config user.name 'github-actions[bot]'")
            os.system("git config user.email '41898282+github-actions[bot]@users.noreply.github.com'")
            os.system("git checkout -B i18n/checkpoint-progress")
            os.system("git add lib/l10n/*.arb")

            commit_msg = f"style(i18n): auto translation checkpoint progress for {target_locale} [github-actions-bot]"
            ret = os.system(f"git commit --amend -m '{commit_msg}' || git commit -m '{commit_msg}'")

            if ret == 0 and token and repository:
                log(f"💾 [隔离分支增量落盘] 语言 `{target_locale}` 已成功在 i18n/checkpoint-progress 分支存盘！")
                push_url = f"https://x-access-token:{token}@github.com/{repository}.git"
                os.system(f"git push --force {push_url} i18n/checkpoint-progress > /dev/null 2>&1")
        except Exception as e:
            log(f"⚠️ 隔离分支增量存盘提示: {e}")


def translate_chunk_with_ollama(chunk: dict, target_lang: str) -> dict:
    target_name = LOCALE_NAME_MAP.get(target_lang, target_lang)
    prompt = f"""
You are a professional Flutter ARB translator.
Translate the values in the following JSON key-value pairs from English to target language '{target_name}'.

Requirements:
1. Return strictly a raw valid JSON object starting with {{ and ending with }}.
2. Keep key names unchanged.
3. Keep placeholders like {{userName}}, {{count}}, {{hours}} unchanged.
4. Do NOT output any markdown formatting or extra explanation.

Input JSON:
{json.dumps(chunk, ensure_ascii=False)}
"""
    max_retries = 2
    for attempt in range(1, max_retries + 1):
        try:
            check_system_load_and_throttle()
            response = chat(
                model=OLLAMA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                options={"num_predict": 4096, "temperature": 0.3}
            )
            raw_text = response.message.content.strip()
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


def process_subtask_ollama(subtask_id: str, target_locale: str, sub_items: list, baseline_data: dict):
    base_lang = target_locale.split("_")[0]
    if target_locale not in HYMT2_SUPPORTED_LANGUAGES and base_lang not in HYMT2_SUPPORTED_LANGUAGES:
        log(f"⏭️ 语言 `{target_locale}` 不属于 Hy-MT2 范畴，安全跳过。")
        return

    arb_path = os.path.join(L10N_DIR, f"app_{target_locale}.arb")

    with file_lock:
        current_data = load_arb(arb_path)
        current_data = sanitize_and_deduplicate_arb(current_data)
        current_data = clean_obsolete_keys_from_target(current_data, set(baseline_data.keys()))

    total_chunks = (len(sub_items) + CHUNK_SIZE - 1) // CHUNK_SIZE
    log(f"🌐 [Ollama 子任务 `{subtask_id}`] 开始处理 {len(sub_items)} 个词条 ({total_chunks} 批)...")

    for i in range(0, len(sub_items), CHUNK_SIZE):
        chunk = dict(sub_items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [批次请求] 子任务 `{subtask_id}` 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条)...")

        try:
            translated_chunk = translate_chunk_with_ollama(chunk, target_locale)
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
    log(f"  Ollama ({OLLAMA_MODEL}) 600条拆分全量 ARB 翻译管道")
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

        sub_count = (len(need_items) + SUBTASK_MAX_SIZE - 1) // SUBTASK_MAX_SIZE
        for s_idx in range(sub_count):
            part_items = need_items[s_idx * SUBTASK_MAX_SIZE: (s_idx + 1) * SUBTASK_MAX_SIZE]
            subtask_id = f"{locale}_part{s_idx + 1}" if sub_count > 1 else locale
            subtasks.append((subtask_id, locale, part_items))

    log(f"🚀 [第二阶段] 全局生成 {len(subtasks)} 个平滑子任务，开启 {MAX_WORKERS} 线程池调度...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_subtask_ollama, sub_id, loc, part_items, baseline_data): sub_id
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
    log("✅ Ollama 600条拆分全量 ARB 翻译全套完成！")
    log("==========================================")


if __name__ == "__main__":
    main()
