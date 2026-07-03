# -*- coding: utf-8 -*-
"""一键转换.doc→.docx→解析→合并到题库"""
import os, json, re, sys

# ---- 项目根目录（脚本在 scripts/ 子目录下） ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

sys.path.insert(0, SCRIPT_DIR)
import win32com.client

BANK_DIR = os.path.join(PROJECT_ROOT, "_temp_bank", "习思想题库 - 副本")
OUTPUT = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")

# 3个旧版.doc
DOC_FILES = ['3.（第三章）.doc', '7（第七章）.doc', '17（第十七章）.doc']

# ---- 第1步：用Word COM转docx ----
print("📄 第1步：转换 .doc → .docx ...")
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

converted = {}
for fname in DOC_FILES:
    doc_path = os.path.join(BANK_DIR, fname)
    docx_path = doc_path.replace('.doc', '_conv.docx')
    if os.path.exists(docx_path):
        print(f"  ⏭ 已存在: {os.path.basename(docx_path)}")
        converted[fname] = docx_path
        continue
    try:
        doc = word.Documents.Open(doc_path)
        doc.SaveAs2(docx_path, FileFormat=16)  # 16=wdFormatDocumentDefault
        doc.Close()
        print(f"  ✅ {fname} → {os.path.basename(docx_path)}")
        converted[fname] = docx_path
    except Exception as e:
        print(f"  ❌ {fname}: {e}")

word.Quit()
print(f"  转换完成: {len(converted)}/3 个文件\n")

# ---- 第2步：解析转换后的docx ----
print("📖 第2步：解析转换后的题目...")
from docx import Document

CHAPTER_NAMES = {
    '3.（第三章）.doc': '第三章 坚持党的全面领导',
    '7（第七章）.doc': '第七章 社会主义现代化建设的教育科技人才战略',
    '17（第十七章）.doc': '第十七章 全面从严治党',
}

def classify_section(line):
    line_clean = line.replace(" ", "").replace("\u3000", "")
    if re.search(r'一[.、．]\s*单', line_clean): return 'single'
    if re.search(r'二[.、．]\s*多', line_clean): return 'multiple'
    if re.search(r'三[.、．]\s*判', line_clean): return 'judge'
    if re.search(r'四[.、．]\s*简', line_clean): return 'essay'
    return None

def parse_answer(title):
    m = re.search(r'[（(]\s*([A-Z√×✓✗\s]+?)\s*[）)]', title)
    if m:
        ans = m.group(1).strip().replace(' ', '').upper()
        clean = re.sub(r'\s*[（(]\s*[A-Z√×✓✗\s]*\s*[）)]\s*', '', title).strip()
        if '√' in ans or '✓' in ans: ans = '正确'
        elif '×' in ans or '✗' in ans: ans = '错误'
        return clean, ans
    return title, ''

def parse_options(lines, si):
    opts, i = [], si
    while i < len(lines) and re.match(r'^[A-H][.、．)\s]', lines[i].strip()):
        opts.append(re.sub(r'^[A-H][.、．)\s]+', '', lines[i].strip()).strip())
        i += 1
    return opts, i

all_new = []

for fname, docx_path in converted.items():
    ch_name = CHAPTER_NAMES.get(fname, fname)
    print(f"  📖 {ch_name}")
    doc = Document(docx_path)
    lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    cur_type = 'single'
    qs = []
    i = 0
    while i < len(lines):
        line = lines[i]
        st = classify_section(line)
        if st: cur_type = st; i += 1; continue
        if not re.match(r'^\d+[.、．]', line): i += 1; continue
        
        title, answer = parse_answer(line)
        title = re.sub(r'^\d+[.、．]\s*', '', title).strip()
        opts, ni = parse_options(lines, i+1)
        
        if not answer: answer = '（待确认）'
        if cur_type == 'judge' and not opts: opts = ['正确', '错误']
        
        q = {'type': cur_type, 'title': title, 'options': opts, 'answer': answer, 'analysis': '', 'chapter': ch_name}
        qs.append(q)
        i = max(ni, i+1)
    
    print(f"    解析出 {len(qs)} 题 (单选:{sum(1 for q in qs if q['type']=='single')}, 多选:{sum(1 for q in qs if q['type']=='multiple')}, 判断:{sum(1 for q in qs if q['type']=='judge')})")
    all_new.extend(qs)

print(f"\n  新增总计: {len(all_new)} 题")

# ---- 第3步：合并到现有题库 ----
print(f"\n📦 第3步：合并到题库...")
with open(OUTPUT, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# 去重
existing_titles = {q['title'].strip() for q in existing}
really_new = [q for q in all_new if q['title'].strip() not in existing_titles]
existing.extend(really_new)

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)

print(f"  原有: {len(existing) - len(really_new)} 题")
print(f"  新增: {len(really_new)} 题（去重后）")
print(f"  总计: {len(existing)} 题")

# 统计
stats = {}
for q in existing:
    stats[q['type']] = stats.get(q['type'], 0) + 1
print(f"\n  题型分布: {json.dumps(stats, ensure_ascii=False)}")
print(f"  ✅ 已更新: {OUTPUT}")
