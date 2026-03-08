import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AIPredictionBadgeProps {
  sideAProbability: number;
  sideBProbability: number;
  confidence: string;
  predictionText?: string;
  sideAName: string;
  sideBName: string;
  sideAColor: string;
  sideBColor: string;
  compact?: boolean;
}

const AIPredictionBadge = ({
  sideAProbability,
  sideBProbability,
  confidence,
  predictionText,
  sideAName,
  sideBName,
  sideAColor,
  sideBColor,
  compact = false,
}: AIPredictionBadgeProps) => {
  const getConfidenceColor = () => {
    switch (confidence) {
      case 'very_high': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'high': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'moderate': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      default: return 'text-muted-foreground bg-muted/20 border-border/30';
    }
  };

  const getTrendIcon = () => {
    const diff = sideAProbability - sideBProbability;
    if (Math.abs(diff) < 5) return <Minus className="w-3 h-3" />;
    return diff > 0 
      ? <TrendingUp className="w-3 h-3" style={{ color: sideAColor }} />
      : <TrendingDown className="w-3 h-3" style={{ color: sideBColor }} />;
  };

  const favoriteSide = sideAProbability >= sideBProbability ? 'a' : 'b';
  const favoriteProb = Math.max(sideAProbability, sideBProbability);
  const favoriteName = favoriteSide === 'a' ? sideAName : sideBName;
  const favoriteColor = favoriteSide === 'a' ? sideAColor : sideBColor;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${getConfidenceColor()} border cursor-help`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Brain className="w-3 h-3" />
            <span className="text-[10px] font-bold">{favoriteProb.toFixed(0)}%</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-bold">AI Prediction</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: sideAColor }}>{sideAName}</span>
                <span className="font-bold">{sideAProbability.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: sideBColor }}>{sideBName}</span>
                <span className="font-bold">{sideBProbability.toFixed(0)}%</span>
              </div>
            </div>
            {predictionText && (
              <p className="text-xs text-muted-foreground italic">{predictionText}</p>
            )}
            <div className="text-[10px] text-muted-foreground">
              Confidence: {confidence.replace('_', ' ')}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"
            animate={{ 
              boxShadow: ['0 0 0 0 rgba(0, 212, 255, 0)', '0 0 10px 2px rgba(0, 212, 255, 0.3)', '0 0 0 0 rgba(0, 212, 255, 0)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-3.5 h-3.5 text-primary" />
          </motion.div>
          <span className="text-xs font-bold text-foreground">AI Prediction</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full ${getConfidenceColor()} border`}>
          <span className="text-[10px] font-medium capitalize">{confidence.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Probability bars */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: sideAColor }}>{sideAName}</span>
            <span className="text-xs font-bold" style={{ color: sideAColor }}>{sideAProbability.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: sideAColor }}
              initial={{ width: '50%' }}
              animate={{ width: `${sideAProbability}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: sideBColor }}>{sideBName}</span>
            <span className="text-xs font-bold" style={{ color: sideBColor }}>{sideBProbability.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: sideBColor }}
              initial={{ width: '50%' }}
              animate={{ width: `${sideBProbability}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Prediction insight */}
      {predictionText && (
        <div className="mt-3 pt-2 border-t border-border/30">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              {predictionText}
            </p>
          </div>
        </div>
      )}

      {/* Current favorite indicator */}
      <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Current favorite:</span>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className="text-xs font-bold" style={{ color: favoriteColor }}>
            {favoriteName}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AIPredictionBadge;