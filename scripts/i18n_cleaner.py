#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Internationalization (i18n) Cleaner Script
在隔离测试仓库中，直接读取主库生成的 01_未使用的翻译键.md 报告进行精准剔除。
"""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime

# ============ 配置 ============
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L10N_DIR = os.path.join(PROJECT_ROOT, "lib", "l10n")
REPORT_DIR = os.path.join(PROJECT_ROOT, "i18n_reports")
BACKUP_ROOT = os.path.join(PROJECT_ROOT, "_l10n_backups")

BASELINE_ARB = "app_en.arb"
METADATA_PREFIX = "@"


def load_arb_dict(arb_path: str) -> dict:
    if not os.path.exists(arb_path):
        return {}
    with open(arb_path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_arb_dict(arb_path: str, data: dict):
    with open(arb_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def parse_unused_keys_from_report(report_path: str) -> set:
    """读取 01_未使用的翻译键.md，解析出所有打钩 [x] 的废弃键"""
    unused_keys = set()
    if not os.path.exists(report_path):
        return unused_keys

    with open(report_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # 匹配格式: - [x] `key_name`
            if line.startswith("- [x] `") or line.startswith("- [X] `"):
                parts = line.split("`")
                if len(parts) >= 3:
                    key = parts[1]
                    unused_keys.add(key)
    return unused_keys


def remove_keys_from_arb(arb_dict: dict, keys_to_remove: set) -> tuple:
    removed_count = 0
    new_dict = {}
    expanded_remove = set()
    for k in keys_to_remove:
        expanded_remove.add(k)
        expanded_remove.add(METADATA_PREFIX + k)

    for k, v in arb_dict.items():
        if k in expanded_remove:
            removed_count += 1
            continue
        new_dict[k] = v
    return new_dict, removed_count


def compute_safe_keys_to_remove() -> tuple:
    report_file = os.path.join(REPORT_DIR, "01_未使用的翻译键.md")
    print(f"[1/2] 正在读取主仓库提供的确认废弃词条清单: {report_file}")

    unused_keys = parse_unused_keys_from_report(report_file)
    print(f"      -> 成功解析出 {len(unused_keys)} 个 100% 确认需删除的词条！")

    return unused_keys, set(), set()


def apply_cleanup(safe_remove_set: set, do_backup: bool = False) -> tuple:
    stats = {}
    import glob
    arb_files = glob.glob(os.path.join(L10N_DIR, "*.arb"))

    print("[2/2] 开始从各个语言 ARB 中精准剔除废弃词条...")
    for af in arb_files:
        base = os.path.basename(af)
        data = load_arb_dict(af)
        new_data, removed = remove_keys_from_arb(data, safe_remove_set)
        if removed > 0:
            dump_arb_dict(af, new_data)
        stats[base] = removed
        if removed > 0:
            print(f"      [*] {base:20s}: 删除 {removed:4d} 条")

    return stats, None


if __name__ == "__main__":
    print("=" * 70)
    print("  i18n 清理工具（直接执行主库报告判定）")
    print("=" * 70)

    keys_to_remove, _, _ = compute_safe_keys_to_remove()
    if keys_to_remove:
        apply_cleanup(keys_to_remove, do_backup=False)
    else:
        print("✅ 未解析到需要清理的废弃词条。")
