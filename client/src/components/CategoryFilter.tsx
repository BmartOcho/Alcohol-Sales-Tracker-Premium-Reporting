import { Badge } from "@/components/ui/badge";

type Category = "liquor" | "wine" | "beer";

type CategoryFilterProps = {
  selectedCategories: Category[];
  onToggle: (category: Category) => void;
};

const categories: { value: Category; label: string; color: string }[] = [
  { value: "liquor", label: "Liquor", color: "#a855f7" },
  { value: "wine", label: "Wine", color: "#e11d48" },
  { value: "beer", label: "Beer", color: "#f59e0b" },
];

export function CategoryFilter({ selectedCategories, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="category-filter">
      {categories.map((category) => {
        const isSelected = selectedCategories.includes(category.value);
        return (
          <Badge
            key={category.value}
            variant={isSelected ? "default" : "outline"}
            className={`cursor-pointer toggle-elevate ${isSelected ? "toggle-elevated" : ""}`}
            style={
              isSelected
                ? {
                    backgroundColor: category.color,
                    borderColor: category.color,
                    color: "white",
                  }
                : { borderColor: category.color, color: category.color }
            }
            onClick={() => onToggle(category.value)}
            data-testid={`badge-category-${category.value}`}
          >
            <div className="w-2 h-2 rounded-full bg-current mr-1.5" />
            {category.label}
          </Badge>
        );
      })}
    </div>
  );
}
