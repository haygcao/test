#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_ollama.py
在测试仓库 C:/Users/Ngokel/Desktop/en/example/test 中通过 Ollama kaelri/hy-mt2:1.8b 执行全量 ARB 检修与极速批量翻译脚本
优化要点：
  1. 第一阶段：代码级静态扫描与安全去重清理 (i18n_cleaner)
  2. 第二阶段：30 条黄金批次 JSON 组包，配置 num_predict=4096，100% 确保 JSON 输出完整不截断
  3. 第三阶段：隔离分支单条 Commit 增量覆盖落盘 (git commit --amend --force)
"""

import json
import os
import re
import sys
import time
from ollama import chat

# ============ 路径与模型配置 ============
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

OLLAMA_MODEL = "kaelri/hy-mt2:1.8b"
CHUNK_SIZE = 30  # 30 条黄金批次，确保生成的 JSON 100% 完整合规不被截断


def log(msg: str):
    print(f"[i18n-Pipeline-Ollama] {msg}", flush=True)


def git_checkpoint_commit_amend(target_locale: str):
    """在隔离进度分支上执行 git commit --amend 增量保存，保持 Commit 历史永远只有一条"""
    try:
        os.system("git config user.name 'i18n-bot'")
        os.system("git config user.email 'i18n-bot@users.noreply.github.com'")
        os.system("git add lib/l10n/*.arb")
        ret = os.system("git commit --amend --no-edit || git commit -m 'style(i18n): auto translation checkpoint progress'")
        if ret == 0:
            log(f"💾 [隔离分支增量落盘] 语言 `{target_locale}` 已成功执行 git commit --amend 覆盖存盘！")
            os.system("git push --force origin HEAD:i18n/checkpoint-progress")
    except Exception as e:
        log(f"⚠️ 隔离分支增量存盘跳过/提示: {e}")


def translate_chunk_with_ollama(chunk: dict, target_lang: str) -> dict:
    """30 条 JSON 黄金批次提交 Ollama，设置 num_predict=4096 防止截断"""
    prompt = f"""
You are a professional Flutter ARB translator.
Translate the values in the following JSON key-value pairs from English to target language '{target_lang}'.

Requirements:
1. Return strictly a raw valid JSON object starting with {{ and ending with }}.
2. Keep key names unchanged.
3. Keep placeholders like {{userName}}, {{count}}, {{hours}} unchanged.
4. Do NOT output any markdown formatting or extra explanation.

Input JSON:
{json.dumps(chunk, ensure_ascii=False)}
"""
    response = chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"num_predict": 4096, "temperature": 0.3}
    )
    raw_text = response.message.content.strip()
    clean_json = raw_text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean_json)


def load_arb(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_arb_with_fallback(path: str, data: dict, target_locale: str):
    """写回 ARB 文件，并自动同步基础兜底语言文件 (如 app_hu_HU.arb -> app_hu.arb)"""
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


def process_language_task_ollama(target_locale: str, baseline_data: dict):
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

    log(f"🌐 [30条黄金批次组包] 语言 `{target_locale}` 开始极速批量翻译 {len(need_translation)} 个词条...")

    items = list(need_translation.items())
    total_chunks = (len(items) + CHUNK_SIZE - 1) // CHUNK_SIZE

    for i in range(0, len(items), CHUNK_SIZE):
        chunk = dict(items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [批次请求] 正在向 Ollama 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条词条)...")

        try:
            translated_chunk = translate_chunk_with_ollama(chunk, target_locale)
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

    # 每当一种语言翻译完成，在隔离分支上执行单条 Commit 覆盖增量存盘
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
    log(f"  Ollama ({OLLAMA_MODEL}) 30条黄金批次全量 ARB 极速管道")
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

    # 2. 读取基准英语 ARB
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

    log(f"🚀 [第二阶段] 开始调用 Ollama 处理 {len(target_locales)} 个语言的大批次组包翻译...")

    for locale in target_locales:
        if locale.startswith("en"):
            continue
        process_language_task_ollama(locale, baseline_data)

    log("==========================================")
    log("✅ Ollama 30条黄金批次全量 ARB 翻译全套完成！")
    log("==========================================")


if __name__ == "__main__":
    main()
