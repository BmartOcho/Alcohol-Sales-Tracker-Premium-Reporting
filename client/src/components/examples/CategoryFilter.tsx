import { useState } from "react";
import { CategoryFilter } from "../CategoryFilter";

export default function CategoryFilterExample() {
  const [selected, setSelected] = useState<("liquor" | "wine" | "beer")[]>(["liquor", "beer"]);

  const handleToggle = (category: "liquor" | "wine" | "beer") => {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="p-4">
      <CategoryFilter selectedCategories={selected} onToggle={handleToggle} />
    </div>
  );
}
