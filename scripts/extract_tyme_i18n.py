#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/extract_tyme_i18n.py
Extracts Chinese text from tyme4dart library and generates standard ARB files.
Organized according to tyme4dart's folder architecture.
"""

import json
import os
import re
import sys
import subprocess
import shutil

# Pinyin transliteration map for common calendar/lunar/solar/culture Chinese characters
PINYIN_MAP = {
    '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
    '午': 'wu', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai',
    '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu_stem', '己': 'ji',
    '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui',
    '初': 'chu', '一': 'yi_1', '二': 'er', '三': 'san', '四': 'si_4', '五': 'wu_5',
    '六': 'liu', '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi',
    '廿': 'nian', '卅': 'sa', '正': 'zheng', '腊': 'la', '闰': 'run', '月': 'yue', '日': 'ri',
    '年': 'nian_yr', '时': 'shi_hr', '刻': 'ke', '分': 'fen', '秒': 'miao',
    '男': 'nan', '女': 'nv', '春': 'chun', '夏': 'xia', '秋': 'qiu', '冬': 'dong',
    '东': 'dong_dir', '南': 'nan_dir', '西': 'xi_dir', '北': 'bei_dir', '中': 'zhong',
    '金': 'jin', '木': 'mu', '水': 'shui', '火': 'huo', '土': 'tu',
    '阴': 'yin_yy', '阳': 'yang_yy', '吉': 'ji_luck', '凶': 'xiong_luck',
    '伏': 'fu', '梅': 'mei', '雨': 'yu', '九_nine': 'jiu_nine',
    '节': 'jie', '气': 'qi_term', '寒': 'han', '暑': 'shu', '露': 'lu', '霜': 'shuang',
    '风': 'feng', '雷': 'lei', '云': 'yun', '电': 'dian',
    '神': 'shen_god', '煞': 'sha', '煞神': 'sha_shen', '宜': 'yi_fit', '忌': 'ji_taboo',
    '蛟': 'jiao', '龙': 'long', '貉': 'he', '兔': 'tu_animal', '狐': 'hu', '虎': 'hu_animal',
    '豹': 'bao', '獬': 'xie', '牛': 'niu', '蝠': 'fu_animal', '鼠': 'shu_animal', '燕': 'yan',
    '猪': 'zhu', '獝': 'xu_animal', '狼': 'lang', '狗': 'gou', '彘': 'zhi', '鸡': 'ji_animal',
    '乌': 'wu_bird', '猴': 'hou', '猿': 'yuan', '犴': 'an', '羊': 'yang_animal', '獐': 'zhang',
    '马': 'ma', '鹿': 'lu_animal', '蛇': 'she', '蚓': 'yin_worm',
    '旦': 'dan', '清': 'qing', '明': 'ming', '端': 'duan', '中': 'zhong', '重': 'chong',
    '除': 'chu_eve', '夕': 'xi_eve', '元': 'yuan_fest', '宵': 'xiao', '头': 'tou',
    '上': 'shang', '巳': 'si_fest', '七': 'qi_fest', '夜': 'ye', '歌': 'ge'
}

def text_to_key(text: str, prefix: str = "") -> str:
    """Converts Chinese text to a valid snake_case ARB key."""
    parts = []
    for char in text:
        if char in PINYIN_MAP:
            parts.append(PINYIN_MAP[char])
        elif '\u4e00' <= char <= '\u9fa5':
            # Fallback for unicode hex
            parts.append(f"c_{ord(char):x}")
        elif char.isalnum():
            parts.append(char.lower())

    raw_key = "_".join(p for p in parts if p)
    if not raw_key:
        raw_key = f"key_{hash(text) & 0xffffffff:x}"

    if prefix:
        full_key = f"{prefix}_{raw_key}"
    else:
        full_key = raw_key

    return full_key

def remove_comments(code: str) -> str:
    """Strips single-line and multiline comments from Dart code."""
    # Remove multiline comments /* ... */
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)
    # Remove single-line comments // ...
    code = re.sub(r'//.*', '', code)
    return code

def extract_strings_from_dart(file_content: str) -> list:
    """Extracts string literals containing Chinese characters from Dart source code."""
    clean_code = remove_comments(file_content)

    # Regex for raw strings, multiline strings, single-quoted and double-quoted strings
    patterns = [
        r'r\'\'\'[\s\S]*?\'\'\'',
        r'r\"\"\"[\s\S]*?\"\"\"',
        r'\'\'\'([\s\S]*?)\'\'\'',
        r'\"\"\"([\s\S]*?)\"\"\"',
        r'r\'([^\'\n]*)\'',
        r'r\"([^\"\n]*)\"',
        r'\'(([^\'\\]|\\.)*)\'',
        r'\"(([^\"\\]|\\.)*)\"'
    ]

    extracted = []
    chinese_re = re.compile(r'[\u4e00-\u9fa5]')

    for pat in patterns:
        for match in re.finditer(pat, clean_code):
            raw_val = match.group(0)
            # Strip quotes
            if raw_val.startswith("r'''") or raw_val.startswith('r"""'):
                val = raw_val[4:-3]
            elif raw_val.startswith("'''") or raw_val.startswith('"""'):
                val = raw_val[3:-3]
            elif raw_val.startswith("r'") or raw_val.startswith('r"'):
                val = raw_val[2:-1]
            elif raw_val.startswith("'") or raw_val.startswith('"'):
                val = raw_val[1:-1]
            else:
                val = raw_val

            # Process unescapes for standard strings
            if not raw_val.startswith('r'):
                val = val.replace('\\n', '\n').replace('\\t', '\t').replace('\\\'', "'").replace('\\"', '"')

            if chinese_re.search(val):
                # Filter out pure code/regex patterns if no actual Chinese words
                val = val.strip()
                if val and val not in extracted:
                    extracted.append(val)

    return extracted

def find_tyme4dart_path(script_dir: str) -> str:
    """Locates the tyme4dart library directory."""
    candidates = [
        os.path.join(script_dir, "..", "..", "designed", "mix", "ref", "calendar-almanac", "tyme4dart"),
        "C:/Users/Ngokel/Desktop/en/designed/mix/ref/calendar-almanac/tyme4dart",
        os.path.join(script_dir, "..", "tyme4dart")
    ]

    for c in candidates:
        abs_c = os.path.abspath(c)
        if os.path.exists(os.path.join(abs_c, "lib")):
            return abs_c

    # Clone as fallback
    fallback_dir = os.path.abspath(os.path.join(script_dir, "..", "tyme4dart_repo"))
    if not os.path.exists(fallback_dir):
        print(f"Cloning tyme4dart repository to {fallback_dir}...")
        subprocess.run(["git", "clone", "https://github.com/6tail/tyme4dart.git", fallback_dir], check=True)
    return fallback_dir

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    tyme_dir = find_tyme4dart_path(script_dir)
    lib_dir = os.path.join(tyme_dir, "lib")
    output_base_dir = os.path.join(project_root, "l10n", "tyme")

    print(f"📌 Source tyme4dart lib: {lib_dir}")
    print(f"📌 Output ARB base directory: {output_base_dir}")

    if not os.path.exists(lib_dir):
        print(f"❌ Error: {lib_dir} does not exist.")
        sys.exit(1)

    extracted_by_folder = {}
    total_strings = 0
    total_files = 0

    for root, dirs, files in os.walk(lib_dir):
        for f in sorted(files):
            if f.endswith('.dart'):
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, lib_dir)
                rel_dir = os.path.dirname(rel_path)

                with open(file_path, 'r', encoding='utf-8') as df:
                    content = df.read()

                strings = extract_strings_from_dart(content)
                if strings:
                    total_files += 1
                    total_strings += len(strings)

                    folder_key = rel_dir if rel_dir else "."
                    if folder_key not in extracted_by_folder:
                        extracted_by_folder[folder_key] = []

                    for s in strings:
                        extracted_by_folder[folder_key].append({
                            'text': s,
                            'file': rel_path,
                            'filename': f
                        })

    print(f"✅ Found {total_strings} Chinese strings across {total_files} files in {len(extracted_by_folder)} folders.")

    # Write ARB files mirroring folder architecture
    for folder_rel, items in extracted_by_folder.items():
        if folder_rel == ".":
            target_dir = output_base_dir
        else:
            target_dir = os.path.join(output_base_dir, folder_rel)

        os.makedirs(target_dir, exist_ok=True)
        arb_file_path = os.path.join(target_dir, "app_zh.arb")

        arb_data = {
            "@@locale": "zh"
        }

        used_keys = set()

        for item in items:
            text = item['text']
            file_rel = item['file']
            file_stem = os.path.splitext(item['filename'])[0]

            # Generate prefix based on filename
            key_base = text_to_key(text, prefix=file_stem)
            key = key_base
            counter = 1
            while key in used_keys:
                key = f"{key_base}_{counter}"
                counter += 1

            used_keys.add(key)
            arb_data[key] = text
            arb_data[f"@{key}"] = {
                "description": f"Extracted from {file_rel}"
            }

        with open(arb_file_path, 'w', encoding='utf-8') as af:
            json.dump(arb_data, af, ensure_ascii=False, indent=2)
            af.write("\n")

        print(f"  📄 Generated: {os.path.relpath(arb_file_path, project_root)} ({len(used_keys)} keys)")

    print("🎉 i18n extraction completed successfully!")

if __name__ == '__main__':
    main()
