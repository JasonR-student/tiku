// ============================================
// 全局类型定义 - 思政题库刷题应用
// ============================================

/** 题型枚举 */
export type QuestionType = 'single' | 'multiple' | 'judge' | 'essay' | 'material';

/** 题型中文标签映射 */
export const QuestionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  essay: '简答题',
  material: '材料分析',
};

/** 题目数据结构 - answer存储具体答案文本，非字母 */
export interface Question {
  id: string;
  type: QuestionType;
  title: string;           // 题干
  options: string[];       // 选项数组
  answer: string;          // 参考答案（选项具体文本，如"《共产党宣言》的发表"，非"A"）
  analysis: string;        // 原始解析
  subQuestions?: { title: string; answer: string; analysis: string }[]; // 材料分析子题
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
  updated_at: string;
  chapter?: string;        // 所属章节
}

/** AI答案缓存数据结构 */
export interface AiCache {
  id: string;
  question_id: string;
  ai_answer: string;           // AI生成的答案
  final_answer: string;        // 复核后最终答案
  ai_analysis: string;         // AI生成的解析
  diff_explanation: string;    // 答案差异说明
  call_count: number;          // 调用次数
  review_status: 'pending' | 'reviewed' | 'consistent'; // 复核状态
  created_at: string;
  updated_at: string;
}

/** 考试记录数据结构 */
export interface ExamRecord {
  id: string;
  total_questions: number;
  total_score: number;
  user_score: number;
  accuracy: number;            // 总正确率
  type_accuracy: Record<QuestionType, number>; // 各题型正确率
  duration: number;            // 用时（秒）
  answer_details: AnswerDetail[]; // 答题详情JSON
  exam_time: string;
}

/** 单题作答详情 */
export interface AnswerDetail {
  question_id: string;
  question_type: QuestionType;
  user_answer: string | string[];
  correct_answer: string;
  is_correct: boolean;
  score: number;
}

/** 题库导入预览项 */
export interface ImportPreviewItem {
  tempId: string;
  type: QuestionType;
  title: string;
  options: string[];
  answer: string;
  analysis: string;
  status: 'valid' | 'warning' | 'error';
  message?: string;
}

/** 用户答题进度（localStorage存储结构） */
export interface UserProgress {
  currentQuestionIndex: number;
  selectedTypes: QuestionType[];
  shuffleQuestions: boolean;     // 题目顺序乱序
  wrongBook: string[];           // 错题本（题目ID数组）
  favorites: string[];           // 收藏夹
  dailyGoal: number;
  todayCompleted: number;
  todayDate: string;
  autoNext: boolean;             // 自动跳下一题
}

/** 默认用户进度 */
export const DEFAULT_PROGRESS: UserProgress = {
  currentQuestionIndex: 0,
  selectedTypes: ['single', 'multiple', 'judge'],
  shuffleQuestions: true,
  wrongBook: [],
  favorites: [],
  dailyGoal: 50,
  todayCompleted: 0,
  todayDate: '',
  autoNext: true,
};

/** 考试固定配置 */
export const EXAM_FIXED_CONFIG = {
  single: { count: 30, score: 1 },     // 单选30题，每题1分
  multiple: { count: 10, score: 2 },   // 多选10题，每题2分
  judge: { count: 20, score: 1 },      // 判断20题，每题1分
  essay: { count: 2, score: 7 },       // 简答2题，每题7分
  material: { count: 1, score: 8 },    // 材料分析1题（2问），共8分
  totalQuestions: 63,                   // 总题量
  totalScore: 100,                      // 满分
} as const;

/** 考试配置 */
export interface ExamConfig {
  totalQuestions: number;
  duration: number;            // 分钟
  scorePerQuestion: number;    // 客观题每题分值
  essayScore: number;          // 简答题每题分值
  selectedTypes: QuestionType[];
}

/** API响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
