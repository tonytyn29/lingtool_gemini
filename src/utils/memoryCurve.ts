// 记忆曲线算法 - 基于Anki的SM-2算法
export interface LearningRecord {
  id: string;
  sentenceId: string;
  learningType: 'sentence_translation' | 'word_learning' | 'pronunciation';
  familiarityLevel: 'unfamiliar' | 'familiar' | 'mastered';
  reviewCount: number;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  easeFactor: number;
  intervalDays: number;
}

export interface ReviewResult {
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: Date;
  shouldReview: boolean;
}

// SM-2算法参数
const SM2_CONFIG = {
  // 初始间隔（天）
  INITIAL_INTERVAL: 1,
  // 初始难度因子
  INITIAL_EASE_FACTOR: 2.5,
  // 最小难度因子
  MIN_EASE_FACTOR: 1.3,
  // 最大难度因子
  MAX_EASE_FACTOR: 3.0,
  // 难度因子调整步长
  EASE_FACTOR_STEP: 0.1,
  // 最小间隔（天）
  MIN_INTERVAL: 1,
  // 最大间隔（天）
  MAX_INTERVAL: 365
};

class MemoryCurveService {
  // 计算下次复习时间
  calculateNextReview(
    record: LearningRecord,
    response: 'unfamiliar' | 'familiar' | 'mastered'
  ): ReviewResult {
    let newInterval = record.intervalDays;
    let newEaseFactor = record.easeFactor;
    let shouldReview = true;

    // 根据用户反馈调整参数
    switch (response) {
      case 'mastered':
        // 完全掌握：增加间隔，提高难度因子
        if (record.reviewCount === 0) {
          newInterval = 1;
        } else if (record.reviewCount === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.floor(record.intervalDays * newEaseFactor);
        }
        newEaseFactor = Math.min(
          newEaseFactor + SM2_CONFIG.EASE_FACTOR_STEP,
          SM2_CONFIG.MAX_EASE_FACTOR
        );
        break;

      case 'familiar':
        // 熟悉：适度增加间隔，保持难度因子
        if (record.reviewCount === 0) {
          newInterval = 1;
        } else if (record.reviewCount === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.floor(record.intervalDays * 1.3);
        }
        // 难度因子保持不变
        break;

      case 'unfamiliar':
        // 不熟悉：重置间隔，降低难度因子
        newInterval = SM2_CONFIG.MIN_INTERVAL;
        newEaseFactor = Math.max(
          newEaseFactor - SM2_CONFIG.EASE_FACTOR_STEP,
          SM2_CONFIG.MIN_EASE_FACTOR
        );
        break;
    }

    // 限制间隔范围
    newInterval = Math.max(
      Math.min(newInterval, SM2_CONFIG.MAX_INTERVAL),
      SM2_CONFIG.MIN_INTERVAL
    );

    // 计算下次复习日期
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      newInterval,
      newEaseFactor,
      nextReviewDate,
      shouldReview
    };
  }

  // 创建新的学习记录
  createLearningRecord(
    sentenceId: string,
    learningType: LearningRecord['learningType']
  ): Omit<LearningRecord, 'id'> {
    return {
      sentenceId,
      learningType,
      familiarityLevel: 'unfamiliar',
      reviewCount: 0,
      easeFactor: SM2_CONFIG.INITIAL_EASE_FACTOR,
      intervalDays: SM2_CONFIG.INITIAL_INTERVAL,
      lastReviewedAt: new Date(),
      nextReviewAt: new Date(Date.now() + SM2_CONFIG.INITIAL_INTERVAL * 24 * 60 * 60 * 1000)
    };
  }

  // 更新学习记录
  updateLearningRecord(
    record: LearningRecord,
    response: 'unfamiliar' | 'familiar' | 'mastered'
  ): LearningRecord {
    const result = this.calculateNextReview(record, response);
    
    return {
      ...record,
      familiarityLevel: response,
      reviewCount: record.reviewCount + 1,
      lastReviewedAt: new Date(),
      nextReviewAt: result.nextReviewDate,
      easeFactor: result.newEaseFactor,
      intervalDays: result.newInterval
    };
  }

  // 获取需要复习的句子
  getSentencesForReview(sentences: Array<{ learningRecord?: LearningRecord }>): Array<{ learningRecord?: LearningRecord }> {
    const now = new Date();
    return sentences.filter(sentence => {
      if (!sentence.learningRecord) {
        return true; // 未学习的句子需要复习
      }
      
      const nextReview = sentence.learningRecord.nextReviewAt;
      return !nextReview || nextReview <= now;
    });
  }

  // 计算学习统计
  calculateLearningStats(sentences: Array<{ learningRecord?: LearningRecord }>) {
    const stats = {
      total: sentences.length,
      mastered: 0,
      familiar: 0,
      unfamiliar: 0,
      unlearned: 0,
      averageEaseFactor: 0,
      averageInterval: 0,
      nextReviewCount: 0
    };

    const now = new Date();
    let totalEaseFactor = 0;
    let totalInterval = 0;
    let learnedCount = 0;

    sentences.forEach(sentence => {
      if (!sentence.learningRecord) {
        stats.unlearned++;
        return;
      }

      const record = sentence.learningRecord;
      
      switch (record.familiarityLevel) {
        case 'mastered':
          stats.mastered++;
          break;
        case 'familiar':
          stats.familiar++;
          break;
        case 'unfamiliar':
          stats.unfamiliar++;
          break;
      }

      if (record.nextReviewAt && record.nextReviewAt <= now) {
        stats.nextReviewCount++;
      }

      totalEaseFactor += record.easeFactor;
      totalInterval += record.intervalDays;
      learnedCount++;
    });

    if (learnedCount > 0) {
      stats.averageEaseFactor = totalEaseFactor / learnedCount;
      stats.averageInterval = totalInterval / learnedCount;
    }

    return stats;
  }

  // 预测学习进度
  predictLearningProgress(
    currentStats: ReturnType<typeof this.calculateLearningStats>,
    targetMasteryRate: number = 0.8
  ): {
    daysToTarget: number;
    estimatedReviews: number;
    confidence: 'low' | 'medium' | 'high';
  } {
    const currentMasteryRate = currentStats.total > 0 ? currentStats.mastered / currentStats.total : 0;
    
    if (currentMasteryRate >= targetMasteryRate) {
      return {
        daysToTarget: 0,
        estimatedReviews: 0,
        confidence: 'high'
      };
    }

    // 基于当前平均间隔和掌握率计算
    const remainingSentences = currentStats.total - currentStats.mastered;
    const averageInterval = currentStats.averageInterval || 7;
    
    // 简化的预测模型
    const estimatedDays = Math.ceil(remainingSentences * averageInterval * 0.3);
    const estimatedReviews = Math.ceil(remainingSentences * 3); // 平均需要3次复习

    let confidence: 'low' | 'medium' | 'high' = 'medium';
    if (currentStats.total < 10) {
      confidence = 'low';
    } else if (currentStats.total > 100 && currentStats.averageEaseFactor > 2.0) {
      confidence = 'high';
    }

    return {
      daysToTarget: estimatedDays,
      estimatedReviews,
      confidence
    };
  }

  // 生成学习建议
  generateLearningAdvice(stats: ReturnType<typeof this.calculateLearningStats>): string[] {
    const advice: string[] = [];
    const masteryRate = stats.total > 0 ? stats.mastered / stats.total : 0;

    if (masteryRate < 0.3) {
      advice.push('建议增加学习频率，每天至少复习20-30个句子');
      advice.push('重点关注不熟悉的句子，多进行翻译练习');
    } else if (masteryRate < 0.6) {
      advice.push('学习进度良好，继续保持当前节奏');
      advice.push('可以适当增加新句子的导入');
    } else {
      advice.push('掌握率很高，可以挑战更难的句子');
      advice.push('建议定期复习已掌握的句子，防止遗忘');
    }

    if (stats.nextReviewCount > 20) {
      advice.push('有较多句子需要复习，建议优先处理');
    }

    if (stats.averageEaseFactor < 2.0) {
      advice.push('整体难度较高，建议放慢学习节奏');
    }

    return advice;
  }

  // 导出学习数据（用于备份或迁移）
  exportLearningData(sentences: Array<{ learningRecord?: LearningRecord }>) {
    return sentences.map(sentence => ({
      sentenceId: sentence.learningRecord?.sentenceId,
      learningRecord: sentence.learningRecord ? {
        ...sentence.learningRecord,
        lastReviewedAt: sentence.learningRecord.lastReviewedAt?.toISOString(),
        nextReviewAt: sentence.learningRecord.nextReviewAt?.toISOString()
      } : null
    }));
  }

  // 导入学习数据
  importLearningData(
    data: Array<{ sentenceId?: string; learningRecord?: any }>,
    sentences: Array<{ learningRecord?: LearningRecord }>
  ) {
    // 这里可以实现数据导入逻辑
    console.log('Importing learning data:', data);
  }
}

// 导出单例实例
export const memoryCurveService = new MemoryCurveService();
export default memoryCurveService;
