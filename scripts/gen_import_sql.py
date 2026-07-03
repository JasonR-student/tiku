# -*- coding: utf-8 -*-
"""生成 import_questions.sql 数据库导入脚本"""
import json, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
INPUT = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")
OUTPUT = os.path.join(PROJECT_ROOT, "import_questions.sql")

with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 转义单引号
def esc(s):
    return str(s).replace("'", "''")

with open(OUTPUT, 'w', encoding='utf-8') as out:
    out.write("-- NEURAL·思政 题库导入脚本\n")
    out.write(f"-- 共 {len(data)} 题\n\n")
    lines = []
    for q in data:
        t = q.get('type', 'single')
        title = esc(q.get('title', ''))
        opts = esc(json.dumps(q.get('options', []), ensure_ascii=False))
        ans = esc(q.get('answer', ''))
        analysis = esc(q.get('analysis', ''))
        ch = esc(q.get('chapter', ''))
        lines.append(f"('{t}','{title}','{opts}','{ans}','{analysis}','{ch}')")
        if len(lines) >= 50:
            out.write('INSERT INTO questions (type,title,options,answer,analysis,chapter) VALUES\n  ' + ',\n  '.join(lines) + ';\n\n')
            lines = []
    if lines:
        out.write('INSERT INTO questions (type,title,options,answer,analysis,chapter) VALUES\n  ' + ',\n  '.join(lines) + ';\n')

size_kb = os.path.getsize(OUTPUT) / 1024
print(f"✅ 已生成: {OUTPUT} ({size_kb:.0f} KB, {len(data)} 题)")
