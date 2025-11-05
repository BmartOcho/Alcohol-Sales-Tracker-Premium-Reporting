import { motion } from "framer-motion";

interface SearchLoadingAnimationProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function SearchLoadingAnimation({ 
  message = "Searching database...", 
  size = "md" 
}: SearchLoadingAnimationProps) {
  const sizeClasses = {
    sm: { container: "h-12", bar: "h-8", text: "text-xs" },
    md: { container: "h-16", bar: "h-12", text: "text-sm" },
    lg: { container: "h-20", bar: "h-16", text: "text-base" }
  };
  
  const currentSize = sizeClasses[size];
  
  const barVariants = {
    start: { scaleY: 0.3, opacity: 0.5 },
    end: { scaleY: 1, opacity: 1 }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className={`flex items-center gap-1.5 ${currentSize.container}`}>
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.div
            key={index}
            className={`w-2 rounded-full bg-primary ${currentSize.bar}`}
            variants={barVariants}
            initial="start"
            animate="end"
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: "reverse",
              delay: index * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      <motion.p 
        className={`font-medium text-muted-foreground ${currentSize.text}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {message}
      </motion.p>
    </div>
  );
}
