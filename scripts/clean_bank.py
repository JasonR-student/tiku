# -*- coding: utf-8 -*-
"""
题库后处理清洗脚本
1. 移除误解析的答案汇总行
2. 清理空题干
3. 标记真正的简答题
4. 输出最终干净JSON
"""

import json, re, os

# ---- 项目根目录（脚本在 scripts/ 子目录下） ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

INPUT = os.path.join(PROJECT_ROOT, "cleaned_questions.json")
OUTPUT = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始: {len(data)} 题")

cleaned = []
removed = 0
fixed_answer = 0

for q in data:
    title = q['title'].strip()
    
    # 1. 移除空题干
    if not title or len(title) < 3:
        removed += 1
        continue
    
    # 2. 检测答案汇总行（如 "D  2、B  3、A  4、B..."）
    if re.match(r'^[A-H√×✓✗\s\d、．]+$', title[:30]):
        removed += 1
        continue
    
    # 3. 检测是否为纯数字/字母的杂行
    if re.match(r'^[\d\s、．A-H]+$', title):
        removed += 1
        continue
    
    # 4. 尝试提取分立的答案行（如 "答案：C" 出现在题干中）
    ans_match = re.search(r'(?:答案|参考答案)[：:]\s*([A-H√×✓✗]+)', title)
    if ans_match and q['answer'] == '（待确认）':
        q['answer'] = ans_match.group(1).strip()
        fixed_answer += 1
        q['title'] = re.sub(r'(?:答案|参考答案)[：:]\s*[A-H√×✓✗]+\s*', '', title).strip()
    
    # 5. 简答题自动设置answer提示
    if q['type'] == 'essay' and q['answer'] == '（待确认）':
        q['answer'] = '（简答题，请参照教材）'
    
    # 6. 如果仍然没有答案且不是简答，尝试从选项匹配
    if q['answer'] == '（待确认）' and q['options']:
        # 保留但标记
        q['answer'] = '（待AI复核）'
    
    cleaned.append(q)

print(f"移除杂行: {removed} 题")
print(f"修正答案: {fixed_answer} 题")
print(f"最终: {len(cleaned)} 题")

# 统计
stats = {'single': 0, 'multiple': 0, 'judge': 0, 'essay': 0}
for q in cleaned:
    stats[q['type']] = stats.get(q['type'], 0) + 1

print(f"\n题型分布:")
for t, c in stats.items():
    names = {'single': '单选', 'multiple': '多选', 'judge': '判断', 'essay': '简答'}
    print(f"  {names.get(t, t)}: {c} 题")

# 输出
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

print(f"\n✅ 已保存: {OUTPUT}")
print(f"📏 大小: {os.path.getsize(OUTPUT)/1024:.1f} KB")
