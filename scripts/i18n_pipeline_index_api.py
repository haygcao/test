#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_index_api.py
Index-Translate 35B-A3B 官方免费公网 API 极速 ARB 本地化翻译管道
特点：
  1. 零本地 GPU/CPU 算力消耗，直连官方 35B-A3B 免费公网接口 (OpenAI 规范)
  2. 智能底稿继承 (load_arb_with_fallback)，仅做增量翻译
  3. 专用隔离分支 i18n/checkpoint-api-progress，单条 Commit 覆盖存盘推送
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

API_URL = "https://index-translate.bilibili.com/v1/chat/completions"
MODEL_NAME = "Index-Translate-35B-A3B"
CHUNK_SIZE = 60
SUBTASK_MAX_SIZE = 600
PUSH_INTERVAL = 1000
PROGRESS_BRANCH = "i18n/checkpoint-api-progress"

translated_counter = 0


def log(msg: str):
    print(f"[i18n-Pipeline-Index35B-API] {msg}", flush=True)


def git_checkpoint_commit_amend(target_locale: str, force: bool = False, count_inc: int = 0):
    """在专用隔离分支 i18n/checkpoint-api-progress 上保持单条 commit 记录存盘推送"""
    global translated_counter
    translated_counter += count_inc

    if not force and translated_counter < PUSH_INTERVAL:
        return

    translated_counter = 0
    try:
        os.environ["GIT_TERMINAL_PROMPT"] = "0"
        token = os.environ.get("GITHUB_TOKEN", "").strip()
        repository = os.environ.get("GITHUB_REPOSITORY", "").strip()

        os.system("git config user.name 'github-actions[bot]'")
        os.system("git config user.email '41898282+github-actions[bot]@users.noreply.github.com'")
        os.system(f"git checkout -B {PROGRESS_BRANCH}")
        os.system("git add lib/l10n/*.arb")

        commit_msg = f"style(i18n): checkpoint translation progress for {target_locale} [github-actions-bot]"
        os.system(f"git commit --amend -m '{commit_msg}' || git commit -m '{commit_msg}'")

        if token and repository:
            push_url = f"https://x-access-token:{token}@github.com/{repository}.git"
            ret = os.system(f"git push --force {push_url} {PROGRESS_BRANCH}")
            if ret == 0:
                log(f"💾 [隔离分支存盘] 进度已成功覆盖推送至 `{PROGRESS_BRANCH}` 分支！")
    except Exception as e:
        log(f"⚠️ 隔离分支存盘提示: {e}")


def translate_chunk_with_api(chunk: dict, target_lang: str) -> dict:
    """提交 60 条 JSON 批次到官方免费 35B-A3B 公网 API 接口"""
    prompt = f"Translate the values in the following JSON key-value pairs from English into target language '{target_lang}'. Note that you should only output the translated result without any additional explanation:\n\n{json.dumps(chunk, ensure_ascii=False)}"

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2048,
        "temperature": 0.0
    }

    req_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Index-Translate-Pipeline-Client/1.0"
        }
    )

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                res_body = resp.read().decode("utf-8")
                res_json = json.loads(res_body)
                raw_text = res_json["choices"][0]["message"]["content"]
                clean_json = raw_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_json)
        except Exception as e:
            if attempt < max_retries:
                time.sleep(2 * attempt)
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


def load_arb_with_fallback(target_locale: str) -> tuple[dict, str]:
    arb_path = os.path.join(L10N_DIR, f"app_{target_locale}.arb")
    if os.path.exists(arb_path):
        return load_arb(arb_path), arb_path

    if "_" in target_locale:
        base_lang = target_locale.split("_")[0]
        base_path = os.path.join(L10N_DIR, f"app_{base_lang}.arb")
        if os.path.exists(base_path):
            return load_arb(base_path), arb_path

    if target_locale.startswith("nb"):
        no_path = os.path.join(L10N_DIR, "app_no.arb")
        if os.path.exists(no_path):
            return load_arb(no_path), arb_path

    return {}, arb_path


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


def process_subtask_index(subtask_id: str, target_locale: str, sub_items: list, baseline_data: dict):
    """单线性顺畅处理不超过 600 条词条的子任务（按 60 条/批次组包），累计存盘并推送隔离分支"""
    current_data, arb_path = load_arb_with_fallback(target_locale)
    current_data = sanitize_and_deduplicate_arb(current_data)
    current_data = clean_obsolete_keys_from_target(current_data, set(baseline_data.keys()))

    total_chunks = (len(sub_items) + CHUNK_SIZE - 1) // CHUNK_SIZE
    log(f"🌐 [子任务 `{subtask_id}`] 开始处理 {len(sub_items)} 个词条 (共 {total_chunks} 个批次)...")

    for i in range(0, len(sub_items), CHUNK_SIZE):
        chunk = dict(sub_items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [API 极速请求] 子任务 `{subtask_id}` 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条)...")

        try:
            translated_chunk = translate_chunk_with_api(chunk, target_locale)
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

            git_checkpoint_commit_amend(target_locale, force=False, count_inc=len(chunk))

        except Exception as e:
            log(f"⚠️ `{subtask_id}` 批次 {chunk_idx}/{total_chunks} 翻译异常: {e}")

    git_checkpoint_commit_amend(target_locale, force=True)
    log(f"🎉 子任务 `{subtask_id}` 处理完毕！")


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
    log("======================================================")
    log(f"  Index-Translate 35B-A3B 官方免费 API 极速增量翻译管道")
    log("======================================================")

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

    log(f"🔗 准备直连官方 35B-A3B 免费公网接口: {API_URL}")

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
        current_data, arb_path = load_arb_with_fallback(locale)
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

    log(f"🚀 [第二阶段] 生成 {len(subtasks)} 个 600条子任务，按 60 条/批次组包顺畅推进...")

    for subtask_id, locale, part_items in subtasks:
        process_subtask_index(subtask_id, locale, part_items, baseline_data)

    git_checkpoint_commit_amend("all_completed", force=True)

    log("======================================================")
    log("✅ Index-Translate 35B-A3B API 全量 ARB 极速翻译全套完成！")
    log("======================================================")


if __name__ == "__main__":
    main()
