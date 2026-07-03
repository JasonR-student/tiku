# -*- coding: utf-8 -*-
"""
AI题库自动清洗脚本
功能：将原始题库JSON发送给DeepSeek V4 Flash逐题清洗
  1. 修正题干中的选项残留（有些题干里混入了选项内容）
  2. 将答案从字母(A/B/C)转换为具体答案文本
  3. 标准化分类题型（单选/多选/判断/简答/材料分析）
  4. 补充缺失的解析
  5. 识别材料分析题及其子题
用法：
  设置环境变量 DEEPSEEK_API_KEY，然后运行
  python ai_clean_bank.py
"""

import json, os, time, re, sys
from urllib import request, error

# ---- 项目根目录（脚本在 scripts/ 子目录下） ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# ============================================================
# API配置（与batch_ai_answers.py共用）
# ============================================================
API_URL = os.environ.get("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-your-key-here")
MODEL_NAME = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

INPUT_FILE = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "cleaned_questions_ai.json")
PROGRESS_FILE = os.path.join(PROJECT_ROOT, "ai_clean_progress.json")

DELAY = 1.0        # 每次API调用间隔（秒）
BATCH_SAVE = 10    # 每N题保存一次进度
MAX_RETRIES = 3

SYSTEM_PROMPT = """你是一个题库清洗专家。我会给你一道思政题库里的题目（JSON格式），请帮我清洗并标准化：

清洗规则：
1. **题干清理**：如果题干文本中混入了选项内容（如A.xxx B.xxx），请将它们从题干中移除，放入options数组
2. **答案标准化**：答案必须是选项对应的具体文本内容，不能是字母。例如：
   - 原始: "answer": "A"  → 应改为 "answer": "《共产党宣言》的发表"
   - 原始: "answer": "ABC" → 应改为 "answer": "实事求是；群众路线；独立自主"
   - 判断题: "正确" 或 "错误"
   - 简答题: 保留原参考答案文本
3. **题型确认**：如果答案有多个选项对应就标为multiple，如果只有一个就标为single
4. **补充解析**：如果analysis为空，请根据题目内容补充一段简短的解析（50字左右）
5. **材料分析题识别**：如果题目包含一段材料/引文+多个子问题，标为material类型，子问题放入subQuestions数组

请只返回清洗后的JSON，不要添加任何解释。格式示例：
{"type":"single","title":"清洗后的题干","options":["选项1","选项2","选项3","选项4"],"answer":"正确选项的具体文本","analysis":"解析内容"}
"""


def call_api(prompt_text):
    """调用DeepSeek API"""
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"请清洗这道题目：\n{json.dumps(prompt_text, ensure_ascii=False, indent=2)}"},
        ],
        "temperature": 0.2,
        "max_tokens": 2000,
    }

    req = request.Request(
        API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )

    with request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data['choices'][0]['message']['content']
        return extract_json(content)


def extract_json(text):
    """从AI返回中提取JSON"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试提取代码块中的JSON
    match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试匹配花括号内容
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # 返回原始文本
    return {"error": True, "raw": text}


def clean_with_fallback(q):
    """
    本地规则清洗（不调用API的快速清理）
    用于处理明显的格式问题
    """
    title = q.get('title', '')
    options = list(q.get('options', []))
    answer = q.get('answer', '').strip()
    qtype = q.get('type', 'single')

    # 1. 如果题干末尾有选项文本，提取出来
    opt_pattern = re.findall(r'[A-H][.、．]\s*([^\sA-H]+)', title)
    if opt_pattern and not options:
        options = opt_pattern
        title = re.sub(r'\s*[A-H][.、．][^A-H]*$', '', title).strip()

    # 2. 答案字母→文本转换（如果答案仍是纯字母且选项存在）
    if re.match(r'^[A-H]+$', answer) and options:
        letters = list(answer)
        texts = []
        for l in letters:
            idx = ord(l) - ord('A')
            if idx < len(options):
                texts.append(options[idx])
        answer = '；'.join(texts) if texts else answer

    # 3. 判断题型修正
    if qtype == 'judge' and answer:
        if any(w in answer for w in ['对', '正确', '是', '√', '✓']):
            answer = '正确'
        elif any(w in answer for w in ['错', '错误', '否', '×', '✗']):
            answer = '错误'

    # 4. 清除答案中的空白括号
    answer = re.sub(r'[（(]\s*[）)]', '', answer).strip()

    return {
        "type": qtype,
        "title": title.strip(),
        "options": options,
        "answer": answer,
        "analysis": q.get('analysis', '').strip(),
        "chapter": q.get('chapter', ''),
    }


def main():
    if API_KEY == 'sk-your-key-here':
        print("❌ 请先设置环境变量 DEEPSEEK_API_KEY")
        print("   PowerShell: $env:DEEPSEEK_API_KEY='sk-xxx'")
        return

    # 加载题库
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    print(f"📚 题库共 {len(questions)} 题")
    print(f"🔧 先用本地规则预处理...")

    # 先本地规则清洗
    local_cleaned = [clean_with_fallback(q) for q in questions]
    local_fixed = sum(1 for i, q in enumerate(questions)
                      if local_cleaned[i]['answer'] != q.get('answer', '')
                      or local_cleaned[i]['title'] != q.get('title', ''))
    print(f"   本地修复: {local_fixed} 题")

    # 加载进度
    progress = {}
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            progress = json.load(f)
        print(f"💾 已有AI清洗进度: {len(progress)} 题")

    print(f"\n🤖 开始AI深度清洗...")
    total = len(local_cleaned)
    success = 0
    failed = 0
    skipped_local_only = 0

    for idx in range(total):
        qid = str(idx)
        if qid in progress:
            skipped_local_only += 1
            continue

        q = local_cleaned[idx]
        title_short = q['title'][:50]
        print(f"\n[{idx+1}/{total}] {title_short}...")

        # 判断是否需要AI清洗（答案还是字母的、题干含杂质的）
        needs_ai = (
            re.match(r'^[A-H]+$', q['answer']) or  # 答案仍是纯字母
            re.search(r'[A-H][.、．]', q['title']) or  # 题干含选项
            len(q.get('options', [])) == 0 and q['type'] not in ['essay', 'material']
        )

        if not needs_ai:
            progress[qid] = q
            skipped_local_only += 1
            continue

        # AI清洗
        result = None
        for retry in range(MAX_RETRIES):
            try:
                result = call_api(q)
                if not result.get('error'):
                    break
                print(f"    ⚠️ AI返回格式异常，重试 {retry+1}/{MAX_RETRIES}")
            except error.HTTPError as e:
                print(f"    ⚠️ HTTP {e.code}: {e.reason}")
                if e.code == 429:
                    time.sleep((retry + 1) * 5)
                elif e.code >= 500:
                    time.sleep(2)
                else:
                    break
            except Exception as e:
                print(f"    ❌ {e}")
                if retry < MAX_RETRIES - 1:
                    time.sleep(2)
                break

        if result and not result.get('error'):
            # 合并：保留原chapter字段
            result['chapter'] = q.get('chapter', '')
            progress[qid] = result
            success += 1
            ans_short = str(result.get('answer', ''))[:60]
            print(f"    ✅ 答案: {ans_short}")
        else:
            # 失败：保留本地清洗结果
            progress[qid] = q
            failed += 1

        # 定期保存
        if (success + failed) % BATCH_SAVE == 0:
            with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
                json.dump(progress, f, ensure_ascii=False)
            print(f"  💾 已保存进度 ({len(progress)}/{total})")

        time.sleep(DELAY)

    # 最终保存
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, ensure_ascii=False)

    # 合并输出
    output = [progress.get(str(i), local_cleaned[i]) for i in range(total)]
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"📊 AI清洗完成！")
    print(f"  总题数: {total}")
    print(f"  本地修复: {local_fixed}")
    print(f"  AI清洗成功: {success}")
    print(f"  AI清洗失败: {failed}")
    print(f"  跳过(无需AI): {skipped_local_only}")
    print(f"  输出文件: {OUTPUT_FILE}")
    print(f"  文件大小: {os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB")


if __name__ == '__main__':
    main()
