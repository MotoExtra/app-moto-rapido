import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, Heart, Zap, Shield, Star, MessageCircle, 
  AlertTriangle, Frown, Package, CheckCircle, DollarSign, 
  Smile, XCircle 
} from "lucide-react";

interface RatingTag {
  id: string;
  name: string;
  category: "positive" | "negative" | "neutral";
  icon: string;
  sort_order: number;
}

interface RatingTagSelectorProps {
  applicableTo: "motoboy" | "restaurant";
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Clock,
  Heart,
  Zap,
  Shield,
  Star,
  MessageCircle,
  AlertTriangle,
  Frown,
  Package,
  CheckCircle,
  DollarSign,
  Smile,
  XCircle,
};

const RatingTagSelector = ({
  applicableTo,
  selectedTags,
  onTagsChange,
}: RatingTagSelectorProps) => {
  const [tags, setTags] = useState<RatingTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from("rating_tags" as any)
        .select("*")
        .or(`applicable_to.eq.${applicableTo},applicable_to.eq.both`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setTags(data as unknown as RatingTag[]);
      }
      setLoading(false);
    };

    fetchTags();
  }, [applicableTo]);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const positiveTags = tags.filter((t) => t.category === "positive");
  const negativeTags = tags.filter((t) => t.category === "negative");

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded-full" />
        ))}
      </div>
    );
  }

  const TagChip = ({ tag }: { tag: RatingTag }) => {
    const isSelected = selectedTags.includes(tag.id);
    const Icon = iconMap[tag.icon] || Star;
    const isPositive = tag.category === "positive";

    return (
      <motion.button
        type="button"
        onClick={() => toggleTag(tag.id)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          transition-all duration-200 border-2
          ${isSelected
            ? isPositive
              ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25"
              : "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25"
            : isPositive
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Icon className="w-3.5 h-3.5" />
        {tag.name}
      </motion.button>
    );
  };

  return (
    <div className="space-y-4">
      {positiveTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Pontos positivos
          </p>
          <div className="flex flex-wrap gap-2">
            {positiveTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
      )}

      {negativeTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Pontos a melhorar
          </p>
          <div className="flex flex-wrap gap-2">
            {negativeTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingTagSelector;
