import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const OfferSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/50">
          <CardHeader className="relative pb-3">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/30 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
            
            <div className="flex items-start justify-between gap-3">
              {/* Avatar skeleton */}
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              
              <div className="flex-1 space-y-2">
                {/* Title skeleton */}
                <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                {/* Subtitle skeleton */}
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              </div>
              
              {/* Badge skeleton */}
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3 pt-0">
            {/* Info rows */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
            
            {/* Badges row */}
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-14 rounded-full bg-muted animate-pulse" />
            </div>
            
            {/* Button skeleton */}
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse mt-4" />
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};
