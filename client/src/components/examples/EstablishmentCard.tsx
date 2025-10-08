import { EstablishmentCard } from "../EstablishmentCard";

export default function EstablishmentCardExample() {
  return (
    <div className="p-4 max-w-sm">
      <EstablishmentCard
        name="The Rustic Tavern"
        address="123 Main Street"
        city="Austin"
        county="Travis"
        totalSales={125000}
        liquorSales={65000}
        wineSales={35000}
        beerSales={25000}
        onClick={() => console.log("Card clicked")}
      />
    </div>
  );
}
