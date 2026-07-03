# -*- coding: utf-8 -*-
"""
批量AI答案校验脚本 v2.0
- 逐题AI生成答案+解析，与题库现有答案比对
- 一致→跳过(省token) | 不一致→以AI为准，解析中注明差异
- 断点续传 | 展示【章节+题号】
用法：$env:DEEPSEEK_API_KEY="sk-xxx" ; python scripts/batch_ai_answers.py
"""
import json, os, time, re
from urllib import request, error

# ---- 项目根目录（脚本在 scripts/ 子目录下） ----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

API_URL = os.environ.get("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-your-key-here")
MODEL_NAME = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

INPUT_FILE = os.path.join(PROJECT_ROOT, "cleaned_questions_final.json")
CACHE_FILE = os.path.join(PROJECT_ROOT, "ai_answers_cache.json")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "questions_with_ai.json")

DELAY = 0.6; MAX_RETRIES = 2; BATCH_SAVE = 10

TYPE_PROMPTS = {
    'single': '思政课助教。给单选题答案(选项具体文本)+解析。JSON:{"answer":"选项文本","analysis":"解析"}',
    'multiple': '思政课助教。给多选题答案(正确选项用；分隔)+解析。JSON:{"answer":"文本1；文本2","analysis":"解析"}',
    'judge': '思政课助教。判断正误。JSON:{"answer":"正确"或"错误","analysis":"解析"}',
    'essay': '思政课助教。给简答要点。JSON:{"answer":"要点","analysis":"评分解析"}',
    'material': '思政课助教。给材料分析答案。JSON:{"answer":"答案","analysis":"综合解析"}',
}
TL = {'single':'单选','multiple':'多选','judge':'判断','essay':'简答','material':'材料'}

def load(p): return json.load(open(p,'r',encoding='utf-8')) if os.path.exists(p) else {}
def save(p,d): json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2)

def norm(s):
    n = re.sub(r'\s+','',str(s)).lower()
    return n.replace('；',';').replace('，',',').replace('✓','正确').replace('✗','错误')

def match(ans_ai, ans_orig, qtype):
    a, b = norm(ans_ai), norm(ans_orig)
    if a == b: return True
    if qtype == 'judge':
        pos = ('正确','对','是','√','✓'); neg = ('错误','错','否','×','✗')
        if any(w in a for w in pos) and any(w in b for w in pos): return True
        if any(w in a for w in neg) and any(w in b for w in neg): return True
    if len(a) > 2 and len(b) > 2 and (a in b or b in a): return True
    return False

def call_ai(q):
    qtype = q.get('type','single')
    msg = f"【{TL.get(qtype,qtype)}】{q.get('title','')}"
    opts = q.get('options',[])
    if opts: msg += "\n" + "\n".join(f"{chr(65+i)}. {o}" for i,o in enumerate(opts))
    orig = q.get('answer','').strip()
    if orig and orig not in ('（待确认）','（待AI复核）','（简答题，请参照教材）'):
        msg += f"\n【现有答案】{orig}"

    payload = {"model":MODEL_NAME,"messages":[{"role":"system","content":TYPE_PROMPTS.get(qtype,TYPE_PROMPTS['single'])},{"role":"user","content":msg}],"temperature":0.2,"max_tokens":1200}
    req = request.Request(API_URL, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type":"application/json","Authorization":f"Bearer {API_KEY}"})
    with request.urlopen(req, timeout=120) as resp:
        d = json.loads(resp.read().decode('utf-8'))
        txt = d['choices'][0]['message']['content']
        try: return json.loads(txt)
        except:
            m = re.search(r'\{[\s\S]*\}', txt)
            if m:
                try: return json.loads(m.group(0))
                except: pass
        return {"answer":txt[:200],"analysis":txt}

def main():
    if API_KEY == 'sk-your-key-here':
        print("❌ 请先: $env:DEEPSEEK_API_KEY='sk-xxx'"); return
    qs = load(INPUT_FILE)
    if not qs: print(f"❌ 题库不存在"); return
    cache = load(CACHE_FILE)
    print(f"📚 {len(qs)}题 | 💾缓存{len(cache)}题")

    total = len(qs); skipped = 0; matched = 0; contested = 0; failed = 0

    for idx, q in enumerate(qs):
        qid = f"{idx:04d}"
        ch = q.get('chapter','未知')[:20]; t = q.get('type','single')
        ts = q.get('title','')[:40]

        if qid in cache:
            skipped += 1; continue

        if t in ('essay','material'):
            cache[qid] = {"title":ts,"type":t,"chapter":ch,"ai_answer":q.get('answer',''),"ai_analysis":"","status":"主观题"}
            skipped += 1; continue

        # 显示章节+题型+题号
        ch_num = idx + 1
        print(f"\n[{ch_num}/{total}] 【{ch}】{TL.get(t,t)} | {ts}")

        result = None
        for retry in range(MAX_RETRIES):
            try:
                result = call_ai(q); break
            except error.HTTPError as e:
                if e.code == 429: time.sleep((retry+1)*5)
                elif e.code >= 500: time.sleep(2)
                else: break
            except Exception as e:
                msg = str(e)[:60]; print(f"  ❌ {msg}")
                if retry < MAX_RETRIES-1: time.sleep(2)

        if not result:
            cache[qid] = {"title":ts,"type":t,"chapter":ch,"ai_answer":"（生成失败）","ai_analysis":"","status":"failed"}
            failed += 1
        else:
            ai_ans = result.get('answer','').strip()
            ai_exp = result.get('analysis','').strip()
            orig = q.get('answer','').strip()

            if match(ai_ans, orig, t):
                cache[qid] = {"title":ts,"type":t,"chapter":ch,"ai_answer":ai_ans,"ai_analysis":ai_exp,"original_answer":orig,"status":"一致"}
                matched += 1
                print(f"  ✅ 一致 | {ai_ans[:50]}")
            else:
                diff = f"\n\n⚠️ 答案争议：题库原答案「{orig}」→ AI判定「{ai_ans}」，以AI为准。"
                full = (ai_exp + diff) if ai_exp else diff.strip()
                cache[qid] = {"title":ts,"type":t,"chapter":ch,"ai_answer":ai_ans,"ai_analysis":full,"original_answer":orig,"status":"争议"}
                contested += 1
                print(f"  ⚠️ 争议！原:{orig[:25]} → AI:{ai_ans[:25]}")

        if (matched + contested + failed) % BATCH_SAVE == 0:
            save(CACHE_FILE, cache)

        time.sleep(DELAY)

    save(CACHE_FILE, cache)

    # 合并输出
    out = []
    for idx, q in enumerate(qs):
        qid = f"{idx:04d}"
        o = dict(q)
        if qid in cache:
            c = cache[qid]
            o['ai_answer'] = c.get('ai_answer','')
            o['ai_analysis'] = c.get('ai_analysis','')
            o['ai_status'] = c.get('status','')
            o['original_answer'] = c.get('original_answer', q.get('answer',''))
        out.append(o)
    save(OUTPUT_FILE, out)

    print(f"\n{'='*50}")
    print(f"📊 总{total}题 | ✅一致{matched} | ⚠️争议{contested} | ⏭跳过{skipped} | ❌失败{failed}")
    if contested:
        print(f"\n📋 争议题：")
        for k,v in cache.items():
            if v.get('status')=='争议':
                print(f"  [{v.get('chapter','')}] {v.get('title','')[:50]}")

if __name__ == '__main__':
    main()
