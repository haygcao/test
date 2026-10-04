#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/i18n_pipeline_index_gguf.py
Index-Translate 2B GGUF (llama.cpp CPU 极速量化推理) 全量 ARB 翻译管道
特点：
  1. 采用官方 Index-Translate-2B-GGUF (Index-Translate-2B.IQ4_XS.gguf 1.23GB 极速轻量) 模型
  2. 严格对齐普通版逻辑：600 条大任务切分，内部按 60 条批次 (CHUNK_SIZE = 60) 组包推进
  3. 单模型独占 2 线程 (n_threads=2) 完美适配 GitHub Actions Runner
  4. 具备多层 JSON 自愈、二分重试与异常兜底容错机制，绝不卡死
  5. 每次批次落盘强制 gc.collect() 释放内存，防止 Swap 换页卡顿
  6. 累计每满 1000 条或子任务完成时向 i18n/checkpoint-progress 分支执行单条 Commit 覆盖推送
"""

import json
import os
import re
import sys
import time
import gc
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
LANG_DATA_FILE = os.path.join(PROJECT_ROOT, "lib", "features", "language", "language_data.dart")
BASELINE_ARB = os.path.join(L10N_DIR, "app_en.arb")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

MODEL_REPO = "IndexTeam/Index-Translate-2B-GGUF"
MODEL_FILENAME = "Index-Translate-2B.IQ4_XS.gguf"
CHUNK_SIZE = 60        # 严格与普通版保持一致：60 条批次组包
SUBTASK_MAX_SIZE = 600 # 严格与普通版保持一致：600 条大任务切分上限
PUSH_INTERVAL = 1000   # 累计每满 1000 条词条才执行一次远程分支存盘推送

llm = None
translated_counter = 0


def log(msg: str):
    print(f"[i18n-Pipeline-IndexGGUF] {msg}", flush=True)


def git_checkpoint_commit_amend(target_locale: str, force: bool = False, count_inc: int = 0):
    """在隔离进度分支上保持永远只有一条 commit 记录，支持累计满额或强制存盘推送"""
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
        os.system("git checkout -B i18n/checkpoint-progress")
        os.system("git add lib/l10n/*.arb")

        commit_msg = f"style(i18n): checkpoint translation progress for {target_locale} [github-actions-bot]"
        os.system(f"git commit --amend -m '{commit_msg}' || git commit -m '{commit_msg}'")

        if token and repository:
            push_url = f"https://x-access-token:{token}@github.com/{repository}.git"
            ret = os.system(f"git push --force {push_url} i18n/checkpoint-progress")
            if ret == 0:
                log(f"💾 [隔离分支增量存盘] 进度已成功单条覆盖推送至 i18n/checkpoint-progress 分支！")
    except Exception as e:
        log(f"⚠️ 隔离分支增量存盘提示: {e}")


def init_gguf_model():
    """下载并加载 Index-Translate 2B GGUF 极速模型"""
    global llm
    log(f"📦 正在准备 Index-Translate 2B GGUF 官方量化模型: {MODEL_REPO} ({MODEL_FILENAME})...")
    start_time = time.time()

    model_path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILENAME
    )

    log(f"🚀 初始化 llama.cpp 引擎 (n_threads=2, n_ctx=4096)...")
    llm = Llama(
        model_path=model_path,
        n_threads=2,
        n_ctx=4096,
        verbose=False
    )
    log(f"✅ GGUF 模型加载就绪！耗时 {time.time() - start_time:.2f}s")


def extract_json_from_text(text: str) -> dict:
    """极其鲁棒的 JSON 提取器，防范模型输出 Markdown、前后废话与多余逗号"""
    if not text:
        return {}
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        res = json.loads(clean)
        if isinstance(res, dict):
            return res
    except Exception:
        pass

    match = re.search(r"(\{[\s\S]*\})", clean)
    if match:
        json_str = match.group(1)
        try:
            res = json.loads(json_str)
            if isinstance(res, dict):
                return res
        except Exception:
            pass
        fixed_str = re.sub(r",\s*([\}\]])", r"\1", json_str)
        try:
            res = json.loads(fixed_str)
            if isinstance(res, dict):
                return res
        except Exception:
            pass

    return {}


def translate_chunk_with_gguf_safe(chunk: dict, target_lang: str, depth: int = 0) -> dict:
    """60 条 JSON 批次提交 llama.cpp GGUF 推理，带自动重试与二分降级容错"""
    if not chunk:
        return {}

    prompt = f"""Translate the values in the following JSON key-value pairs from English into target language '{target_lang}'. Note that you should only output the translated result without any additional explanation:

{json.dumps(chunk, ensure_ascii=False)}"""

    messages = [{"role": "user", "content": prompt}]

    for attempt in range(1, 3):
        try:
            response = llm.create_chat_completion(
                messages=messages,
                max_tokens=2048,
                temperature=0.0
            )
            raw_text = response["choices"][0]["message"]["content"]
            parsed = extract_json_from_text(raw_text)
            if parsed and isinstance(parsed, dict) and len(parsed) > 0:
                valid_res = {k: str(v) for k, v in parsed.items() if k in chunk}
                if len(valid_res) >= len(chunk) * 0.7:
                    return valid_res
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
            else:
                log(f"⚠️ GGUF 批次推理异常: {e}")

    # 若整体解析失败且当前 chunk > 1，自动二分切小重试（隔离毒药词条）
    if len(chunk) > 1 and depth < 3:
        items = list(chunk.items())
        mid = len(items) // 2
        log(f"🔄 对异常批次进行二分降级重试: {len(items[:mid])} 条 + {len(items[mid:])} 条")
        res_a = translate_chunk_with_gguf_safe(dict(items[:mid]), target_lang, depth + 1)
        res_b = translate_chunk_with_gguf_safe(dict(items[mid:]), target_lang, depth + 1)
        return {**res_a, **res_b}

    log(f"⚠️ 无法翻译的词条降级保留原文: {list(chunk.keys())}")
    return chunk


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
    """单线性顺畅处理不超过 600 条词条的子任务（按 60 条批次组包），累计存盘并推送隔离分支"""
    current_data, arb_path = load_arb_with_fallback(target_locale)
    current_data = sanitize_and_deduplicate_arb(current_data)
    current_data = clean_obsolete_keys_from_target(current_data, set(baseline_data.keys()))

    total_chunks = (len(sub_items) + CHUNK_SIZE - 1) // CHUNK_SIZE
    log(f"🌐 [子任务 `{subtask_id}`] 开始处理 {len(sub_items)} 个词条 (共 {total_chunks} 个批次)...")

    for i in range(0, len(sub_items), CHUNK_SIZE):
        chunk = dict(sub_items[i:i + CHUNK_SIZE])
        chunk_idx = i // CHUNK_SIZE + 1
        log(f"   [批次推理] 子任务 `{subtask_id}` 提交批次 {chunk_idx}/{total_chunks} ({len(chunk)} 条)...")

        try:
            translated_chunk = translate_chunk_with_gguf_safe(chunk, target_locale)
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

        # 每次批次执行完毕强制清理内存，防止 Swap 卡死
        gc.collect()

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
    log("  Index-Translate 2B GGUF (llama.cpp CPU 极速量化) 管道")
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
        log(f"⚠️ 静态清理阶段跳过警告: {e}")

    init_gguf_model()

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

        # 按 600 条切分子任务
        sub_count = (len(need_items) + SUBTASK_MAX_SIZE - 1) // SUBTASK_MAX_SIZE
        for s_idx in range(sub_count):
            part_items = need_items[s_idx * SUBTASK_MAX_SIZE: (s_idx + 1) * SUBTASK_MAX_SIZE]
            subtask_id = f"{locale}_part{s_idx + 1}" if sub_count > 1 else locale
            subtasks.append((subtask_id, locale, part_items))

    log(f"🚀 [第二阶段] 生成 {len(subtasks)} 个 600条子任务，按 60 条批次组包顺畅推进...")

    for subtask_id, locale, part_items in subtasks:
        process_subtask_index(subtask_id, locale, part_items, baseline_data)

    git_checkpoint_commit_amend("all_completed", force=True)

    log("======================================================")
    log("✅ Index-Translate 2B GGUF 全量 ARB 翻译全套完成！")
    log("======================================================")


if __name__ == "__main__":
    main()
