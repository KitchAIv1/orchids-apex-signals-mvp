export type CheckpointEvaluation = {
  price: number
  returnPct: number
  direction: 'UP' | 'DOWN' | 'FLAT'
  directionalAccuracy: boolean
  evaluatedAt: string
}

export type Database = {
  public: {
    Tables: {
      stocks: {
        Row: {
          id: string
          ticker: string
          company_name: string | null
          sector: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          ticker: string
          company_name?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          ticker?: string
          company_name?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      agent_scores: {
        Row: {
          id: string
          stock_id: string
          agent_name: string
          score: number
          weight: number
          reasoning: string | null
          key_metrics: Record<string, unknown> | null
          timestamp: string
        }
        Insert: {
          id?: string
          stock_id: string
          agent_name: string
          score: number
          weight?: number
          reasoning?: string | null
          key_metrics?: Record<string, unknown> | null
          timestamp?: string
        }
        Update: {
          id?: string
          stock_id?: string
          agent_name?: string
          score?: number
          weight?: number
          reasoning?: string | null
          key_metrics?: Record<string, unknown> | null
          timestamp?: string
        }
      }
      predictions: {
        Row: {
          id: string
          stock_id: string
          final_score: number
          recommendation: 'BUY' | 'HOLD' | 'SELL'
          confidence: 'LOW' | 'MEDIUM' | 'HIGH'
          holding_period: string | null
          debate_summary: string | null
          risk_factors: string[] | null
          predicted_at: string
          actual_direction: 'UP' | 'DOWN' | 'FLAT' | null
          directional_accuracy: boolean | null
          price_at_prediction: number | null
          price_at_evaluation: number | null
          return_pct: number | null
          evaluated_at: string | null
          evaluation_5d: CheckpointEvaluation | null
          evaluation_10d: CheckpointEvaluation | null
          evaluation_20d: CheckpointEvaluation | null
        }
        Insert: {
          id?: string
          stock_id: string
          final_score: number
          recommendation: 'BUY' | 'HOLD' | 'SELL'
          confidence: 'LOW' | 'MEDIUM' | 'HIGH'
          holding_period?: string | null
          debate_summary?: string | null
          risk_factors?: string[] | null
          predicted_at?: string
          actual_direction?: 'UP' | 'DOWN' | 'FLAT' | null
          directional_accuracy?: boolean | null
          price_at_prediction?: number | null
          price_at_evaluation?: number | null
          return_pct?: number | null
          evaluated_at?: string | null
          evaluation_5d?: CheckpointEvaluation | null
          evaluation_10d?: CheckpointEvaluation | null
          evaluation_20d?: CheckpointEvaluation | null
        }
        Update: {
          id?: string
          stock_id?: string
          final_score?: number
          recommendation?: 'BUY' | 'HOLD' | 'SELL'
          confidence?: 'LOW' | 'MEDIUM' | 'HIGH'
          holding_period?: string | null
          debate_summary?: string | null
          risk_factors?: string[] | null
          predicted_at?: string
          actual_direction?: 'UP' | 'DOWN' | 'FLAT' | null
          directional_accuracy?: boolean | null
          price_at_prediction?: number | null
          price_at_evaluation?: number | null
          return_pct?: number | null
          evaluated_at?: string | null
          evaluation_5d?: CheckpointEvaluation | null
          evaluation_10d?: CheckpointEvaluation | null
          evaluation_20d?: CheckpointEvaluation | null
        }
      }
      catalyst_events: {
        Row: {
          id: string
          stock_id: string
          event_type: string
          urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description: string | null
          detected_at: string
          impact_on_score: number | null
          triggered_reanalysis: boolean | null
          skip_reason: string | null
          source_url: string | null
        }
        Insert: {
          id?: string
          stock_id: string
          event_type: string
          urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description?: string | null
          detected_at?: string
          impact_on_score?: number | null
          triggered_reanalysis?: boolean | null
          skip_reason?: string | null
          source_url?: string | null
        }
        Update: {
          id?: string
          stock_id?: string
          event_type?: string
          urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description?: string | null
          detected_at?: string
          impact_on_score?: number | null
          triggered_reanalysis?: boolean | null
          skip_reason?: string | null
          source_url?: string | null
        }
      }
      stock_analysis_schedule: {
        Row: {
          id: string
          stock_symbol: string
          last_analyzed: string | null
          next_analysis: string | null
          analysis_frequency: string
          is_active: boolean
          created_at: string
          stock_id: string | null
        }
        Insert: {
          id?: string
          stock_symbol: string
          last_analyzed?: string | null
          next_analysis?: string | null
          analysis_frequency?: string
          is_active?: boolean
          created_at?: string
          stock_id?: string | null
        }
        Update: {
          id?: string
          stock_symbol?: string
          last_analyzed?: string | null
          next_analysis?: string | null
          analysis_frequency?: string
          is_active?: boolean
          created_at?: string
          stock_id?: string | null
        }
      }
      recommendation_history: {
        Row: {
          id: string
          stock_id: string
          previous_recommendation: string | null
          new_recommendation: string
          previous_score: number | null
          new_score: number
          change_reason: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          stock_id: string
          previous_recommendation?: string | null
          new_recommendation: string
          previous_score?: number | null
          new_score: number
          change_reason?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          stock_id?: string
          previous_recommendation?: string | null
          new_recommendation?: string
          previous_score?: number | null
          new_score?: number
          change_reason?: string | null
          changed_at?: string
        }
      }
      agent_performance: {
        Row: {
          id: string
          agent_name: string
          period_start: string
          period_end: string
          total_predictions: number
          correct_predictions: number
          accuracy_rate: number | null
          avg_score: number | null
          calculated_at: string
        }
        Insert: {
          id?: string
          agent_name: string
          period_start: string
          period_end: string
          total_predictions?: number
          correct_predictions?: number
          accuracy_rate?: number | null
          avg_score?: number | null
          calculated_at?: string
        }
        Update: {
          id?: string
          agent_name?: string
          period_start?: string
          period_end?: string
          total_predictions?: number
          correct_predictions?: number
          accuracy_rate?: number | null
          avg_score?: number | null
          calculated_at?: string
        }
      }
      sentiment_history: {
        Row: {
          id: string
          stock_id: string
          source: string
          sentiment_score: number
          article_count: number
          key_topics: string[] | null
          recorded_at: string
        }
        Insert: {
          id?: string
          stock_id: string
          source: string
          sentiment_score: number
          article_count?: number
          key_topics?: string[] | null
          recorded_at?: string
        }
        Update: {
          id?: string
          stock_id?: string
          source?: string
          sentiment_score?: number
          article_count?: number
          key_topics?: string[] | null
          recorded_at?: string
        }
      }
      paper_portfolio: {
        Row: {
          id: string
          initial_balance: number
          cash_balance: number
          total_value: number
          total_return_pct: number | null
          benchmark_return_pct: number | null
          benchmark_start_price: number | null
          win_rate: number | null
          total_trades: number
          winning_trades: number
          auto_execute_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          initial_balance?: number
          cash_balance?: number
          total_value?: number
          total_return_pct?: number | null
          benchmark_return_pct?: number | null
          benchmark_start_price?: number | null
          win_rate?: number | null
          total_trades?: number
          winning_trades?: number
          auto_execute_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          initial_balance?: number
          cash_balance?: number
          total_value?: number
          total_return_pct?: number | null
          benchmark_return_pct?: number | null
          benchmark_start_price?: number | null
          win_rate?: number | null
          total_trades?: number
          winning_trades?: number
          auto_execute_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      paper_trades: {
        Row: {
          id: string
          portfolio_id: string
          ticker: string
          prediction_id: string | null
          trade_type: 'BUY' | 'SELL'
          status: 'OPEN' | 'CLOSED'
          shares: number
          entry_price: number
          exit_price: number | null
          entry_timestamp: string
          exit_timestamp: string | null
          total_cost: number
          total_proceeds: number | null
          realized_pnl: number | null
          realized_pnl_pct: number | null
          ai_confidence: number | null
          ai_direction: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          ticker: string
          prediction_id?: string | null
          trade_type: 'BUY' | 'SELL'
          status?: 'OPEN' | 'CLOSED'
          shares: number
          entry_price: number
          exit_price?: number | null
          entry_timestamp?: string
          exit_timestamp?: string | null
          total_cost: number
          total_proceeds?: number | null
          realized_pnl?: number | null
          realized_pnl_pct?: number | null
          ai_confidence?: number | null
          ai_direction?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          ticker?: string
          prediction_id?: string | null
          trade_type?: 'BUY' | 'SELL'
          status?: 'OPEN' | 'CLOSED'
          shares?: number
          entry_price?: number
          exit_price?: number | null
          entry_timestamp?: string
          exit_timestamp?: string | null
          total_cost?: number
          total_proceeds?: number | null
          realized_pnl?: number | null
          realized_pnl_pct?: number | null
          ai_confidence?: number | null
          ai_direction?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Stock = Database['public']['Tables']['stocks']['Row']
export type AgentScore = Database['public']['Tables']['agent_scores']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
export type CatalystEvent = Database['public']['Tables']['catalyst_events']['Row']
export type StockAnalysisSchedule = Database['public']['Tables']['stock_analysis_schedule']['Row']
export type RecommendationHistory = Database['public']['Tables']['recommendation_history']['Row']
export type AgentPerformance = Database['public']['Tables']['agent_performance']['Row']
export type SentimentHistory = Database['public']['Tables']['sentiment_history']['Row']
export type PaperPortfolio = Database['public']['Tables']['paper_portfolio']['Row']
export type PaperTrade = Database['public']['Tables']['paper_trades']['Row']

export type AgentName = 'fundamental' | 'technical' | 'sentiment' | 'macro' | 'insider' | 'catalyst'