import React from "react";
import { useParams } from "react-router-dom";
import { EstablishmentDashboard } from "@/components/EstablishmentDashboard";

export default function EstablishmentPage() {
  const { permit } = useParams<{ permit: string }>();

  if (!permit) {
    return (
      <div className="p-4 text-sm text-red-600">
        No permit found in URL.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <EstablishmentDashboard permit={permit} />
    </div>
  );
}
