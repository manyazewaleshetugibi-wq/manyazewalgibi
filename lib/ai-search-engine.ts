// lib/ai-search-engine.ts - Updated for comparisons

import clientPromise from './mongodb';
import { AIClient, AIUnderstanding } from './ai-client';

export interface AISearchResult {
  success: boolean;
  query: string;
  aiResponse: string;
  insights: string[];
  data: any[];
  suggestedQuestions: string[];
  metadata: {
    intent: string;
    collectionsUsed: string[];
    total: number;
    processingTime: number;
    aiExplanation: string;
  };
}

export class AISearchEngine {
  private aiClient: AIClient;
  private schemaLoaded: boolean = false;

  constructor() {
    this.aiClient = new AIClient();
  }

  private async ensureSchemaLoaded(): Promise<void> {
    if (!this.schemaLoaded) {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || 'gold');
      await this.aiClient.setDatabaseSchema(db);
      this.schemaLoaded = true;
    }
  }

  async search(userQuery: string): Promise<AISearchResult> {
    const startTime = Date.now();
    
    try {
      await this.ensureSchemaLoaded();
      
      console.log('🤖 Understanding:', userQuery);
      const understanding = await this.aiClient.understandQuery(userQuery);
      console.log('📋 Plan:', JSON.stringify(understanding, null, 2));
      
      const results = await this.executeQuery(understanding);
      const aiResponse = await this.aiClient.generateResponse(userQuery, results, understanding);
      const suggestedQuestions = await this.aiClient.suggestFollowUps(userQuery, results, understanding);
      const insights = this.generateInsights(results, understanding);
      
      return {
        success: true,
        query: userQuery,
        aiResponse: aiResponse,
        insights: insights,
        data: results,
        suggestedQuestions: suggestedQuestions,
        metadata: {
          intent: understanding.intent || 'search',
          collectionsUsed: understanding.collections || [],
          total: results.length,
          processingTime: Date.now() - startTime,
          aiExplanation: understanding.explanation || 'Processed query'
        }
      };
      
    } catch (error) {
      console.error('Search Error:', error);
      return {
        success: false,
        query: userQuery,
        aiResponse: `I couldn't process your question. Please try rephrasing.`,
        insights: [],
        data: [],
        suggestedQuestions: ['Show me total revenue this month', 'Compare with last month', 'Show me low stock items'],
        metadata: {
          intent: 'error',
          collectionsUsed: [],
          total: 0,
          processingTime: 0,
          aiExplanation: 'Fallback mode'
        }
      };
    }
  }

  private async executeQuery(understanding: AIUnderstanding): Promise<any[]> {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'gold');
    
    const allResults: any[] = [];
    
    // Handle COMPARISON queries (compare two time periods)
    if (understanding.comparison === true && understanding.currentPeriod && understanding.previousPeriod) {
      console.log('📊 Running comparison query...');
      
      const collection = db.collection(understanding.collections[0]);
      
      // Query for current period
      const currentPipeline = [
        {
          $match: {
            status: "COMPLETED",
            createdAt: {
              $gte: understanding.currentPeriod.start,
              $lte: understanding.currentPeriod.end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 }
          }
        }
      ];
      
      // Query for previous period
      const previousPipeline = [
        {
          $match: {
            status: "COMPLETED",
            createdAt: {
              $gte: understanding.previousPeriod.start,
              $lte: understanding.previousPeriod.end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 }
          }
        }
      ];
      
      const [currentResult, previousResult] = await Promise.all([
        collection.aggregate(currentPipeline).toArray(),
        collection.aggregate(previousPipeline).toArray()
      ]);
      
      const current = currentResult[0] || { totalRevenue: 0, orderCount: 0 };
      const previous = previousResult[0] || { totalRevenue: 0, orderCount: 0 };
      
      allResults.push(
        { ...current, _period: 'current', _periodLabel: 'This Period' },
        { ...previous, _period: 'previous', _periodLabel: 'Previous Period' }
      );
      
      return allResults;
    }
    
    // Handle regular queries
    for (const collectionName of understanding.collections || ['orders']) {
      try {
        const collection = db.collection(collectionName);
        const mongoQuery = understanding.mongoQuery || {};
        
        const isAggregation = mongoQuery && (
          mongoQuery.$match || mongoQuery.$group || 
          mongoQuery.$unwind || mongoQuery.$sort ||
          understanding.aggregation === true
        );
        
        let results: any[] = [];
        
        if (isAggregation) {
          const pipeline: any[] = [];
          
          if (mongoQuery.$match) pipeline.push({ $match: mongoQuery.$match });
          if (mongoQuery.$unwind) pipeline.push({ $unwind: mongoQuery.$unwind });
          if (mongoQuery.$group) pipeline.push({ $group: mongoQuery.$group });
          if (mongoQuery.$sort) pipeline.push({ $sort: mongoQuery.$sort });
          if (mongoQuery.$limit) pipeline.push({ $limit: mongoQuery.$limit });
          
          results = await collection.aggregate(pipeline).toArray();
        } else {
          let cursor = collection.find(mongoQuery);
          
          if (understanding.projection && understanding.projection.length > 0) {
            const projection: any = {};
            understanding.projection.forEach(field => { projection[field] = 1; });
            cursor = cursor.project(projection);
          }
          
          results = await cursor.limit(understanding.limit || 50).toArray();
        }
        
        results.forEach(doc => {
          allResults.push({
            ...doc,
            _collection: collectionName,
            _id: doc._id?.toString()
          });
        });
        
      } catch (error) {
        console.error(`Error in ${collectionName}:`, error);
      }
    }
    
    return allResults;
  }

  private generateInsights(results: any[], understanding: AIUnderstanding): string[] {
    const insights: string[] = [];
    
    if (results.length === 0) {
      insights.push('📭 No results found');
      return insights;
    }
    
    // Comparison insights
    if (understanding.comparison === true && results.length >= 2) {
      const current = results.find(r => r._period === 'current') || results[0];
      const previous = results.find(r => r._period === 'previous') || results[1];
      
      const currentRevenue = current?.totalRevenue || 0;
      const previousRevenue = previous?.totalRevenue || 0;
      const difference = currentRevenue - previousRevenue;
      const percentChange = previousRevenue > 0 ? (difference / previousRevenue) * 100 : 0;
      
      insights.push(`📈 ${understanding.compareType?.replace('_', ' vs ') || 'Comparison'}`);
      insights.push(`💰 Current: ${currentRevenue.toFixed(2)} birr`);
      insights.push(`📉 Previous: ${previousRevenue.toFixed(2)} birr`);
      insights.push(`📊 Change: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} birr (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);
      return insights;
    }
    
    // Regular insights
    if (understanding.aggregation === true && results[0]) {
      const totalRevenue = results[0].totalRevenue || results[0].total || 0;
      insights.push(`💰 Total Revenue: ${totalRevenue.toFixed(2)} birr`);
      if (results[0].orderCount) {
        insights.push(`📊 Total Orders: ${results[0].orderCount}`);
      }
    }
    
    insights.push(`📊 Found ${results.length} result(s)`);
    if (understanding.explanation) {
      insights.push(`💡 ${understanding.explanation}`);
    }
    
    return insights;
  }
}
