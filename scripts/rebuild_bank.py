# -*- coding: utf-8 -*-
"""
题库选项重建脚本
逐题清洗：拆分合并选项、字母答案→文本答案、补充缺失选项
优先使用原始文档答案，AI答案后续覆盖
"""
import json, re, os

# ---- 项目根目录（脚本在 scripts/ 子目录下） ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

INPUT = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")
OUTPUT = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")  # 直接覆盖

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"📚 原始: {len(data)} 题")

fixed_opts = 0   # 选项拆分修复
fixed_ans = 0    # 答案字母→文本
fixed_title = 0  # 题干清理（移除嵌入的选项）
empty_filled = 0 # 补充空选项
total = len(data)

for idx, q in enumerate(data):
    title = q.get('title', '').strip()
    qtype = q.get('type', 'single')
    opts = list(q.get('options', []))
    answer = q.get('answer', '').strip()
    chapter = q.get('chapter', '')

    # ====== 步骤1：从题干中提取嵌入的选项 ======
    # 模式：题干末尾跟着 "A.xxx  B.xxx  C.xxx  D.xxx"
    title_opts_match = re.search(r'\s{2,}([A-H][.、．])', title)
    if title_opts_match and (not opts or len(opts) <= 2):
        # 题干中有选项标记，提取选项
        prefix = title[:title_opts_match.start()].strip()
        suffix = title[title_opts_match.start():].strip()
        
        # 按 A. B. C. D. 分割
        parts = re.split(r'\s+(?=[A-H][.、．])', suffix)
        new_opts = []
        for p in parts:
            m = re.match(r'^[A-H][.、．]\s*(.+)', p.strip())
            if m:
                new_opts.append(m.group(1).strip())
        
        if len(new_opts) >= 2:
            title = prefix
            opts = new_opts
            fixed_title += 1
            fixed_opts += 1

    # ====== 步骤2：拆分合并的选项（"反腐败 B.艰苦奋斗" → ["反腐败","艰苦奋斗"]） ======
    if len(opts) <= 2 and len(opts) > 0:
        has_merged = any(re.search(r'[B-H][.、．]', o) for o in opts)
        if has_merged:
            new_opts = []
            for o in opts:
                parts = re.split(r'\s+(?=[A-H][.、．])', o)
                for p in parts:
                    cleaned = re.sub(r'^[A-H][.、．]\s*', '', p).strip()
                    if cleaned:
                        new_opts.append(cleaned)
            if len(new_opts) > len(opts):
                opts = new_opts
                fixed_opts += 1

    # ====== 步骤3：清理题干中的残留选项文本 ======
    # 常见模式：题干末尾含 "A.xxx  B.xxx" 但已被步骤1处理
    # 未处理的：题干中间夹杂选项
    title = re.sub(r'\s{2,}[A-H][.、．][^A-H]*$', '', title).strip()
    # 去掉题干末尾的填空括号和空格
    title = re.sub(r'[（(]\s*[）)]\s*$', '', title).strip()

    # ====== 步骤4：判断题选项标准化 ======
    if qtype == 'judge':
        if not opts or len(opts) < 2:
            opts = ['正确', '错误']
            if not opts or len(opts) < 2:
                empty_filled += 1
        # 答案标准化
        if answer in ['A', 'a', '√', '✓'] or any(w in answer for w in ['对', '正确', '是']):
            answer = '正确'
        elif answer in ['B', 'b', '×', '✗'] or any(w in answer for w in ['错', '错误', '否']):
            answer = '错误'

    # ====== 步骤5：字母答案→文本答案 ======
    if re.match(r'^[A-H]+$', answer) and opts:
        letters = list(answer.upper())
        texts = []
        for l in letters:
            idx = ord(l) - ord('A')
            if idx < len(opts):
                texts.append(opts[idx])
        if texts:
            answer = '；'.join(texts) if len(texts) > 1 else texts[0]
            fixed_ans += 1

    # ====== 步骤6：补充缺失选项（最后手段） ======
    if not opts and qtype not in ('essay', 'material'):
        # 尝试从标题中找选项
        fallback = re.findall(r'[A-H][.、．]\s*([^\sA-H]+)', title)
        if fallback:
            opts = fallback
            empty_filled += 1

    # ====== 写回 ======
    q['title'] = title.strip()
    q['options'] = opts
    q['answer'] = answer
    q['chapter'] = chapter

    if (idx + 1) % 100 == 0:
        print(f"  处理 {idx+1}/{total}...")

# 保存
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 统计
still_letter = sum(1 for q in data if re.match(r'^[A-H]+$', q.get('answer','').strip()))
still_merged = sum(1 for q in data if len(q.get('options',[])) <= 2 and len(q.get('options',[])) > 0 and any(re.search(r'[B-H][.、．]', o) for o in q.get('options',[])))
stats = {}
for q in data:
    stats[q['type']] = stats.get(q['type'], 0) + 1

print(f"\n✅ 重建完成")
print(f"  题干清理: {fixed_title} 题")
print(f"  选项拆分: {fixed_opts} 题")
print(f"  答案文本化: {fixed_ans} 题")
print(f"  补充选项: {empty_filled} 题")
print(f"  剩余字母答案: {still_letter} 题")
print(f"  剩余合并选项: {still_merged} 题")
print(f"  题型分布: {json.dumps(stats, ensure_ascii=False)}")
print(f"  文件: {OUTPUT} ({os.path.getsize(OUTPUT)/1024:.1f} KB)")
