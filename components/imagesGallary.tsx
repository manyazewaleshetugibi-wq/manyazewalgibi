"use client";
import React from "react";
import { LayoutGrid } from "@/components/ui/layout-grid";

export function ImageFeatures() {
  return (
    <div className="h-screen py-20 w-full">
      <LayoutGrid cards={cards} />
    </div>
  );
}

const LocationInfo = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Prime Location
      </p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Manyazewal Restaurant is conveniently located in the heart of Addis Ababa, 
        at the back of Bole Selam City Mall. Our central position makes us easily 
        accessible for both locals and tourists looking for an authentic Ethiopian dining experience.
      </p>
    </div>
  );
};

const RestaurantFeatures = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Unique Features
      </p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Manyazewal Restaurant offers a blend of traditional and modern Ethiopian cuisine. 
        Our spacious dining area, adorned with cultural artifacts, creates a warm and 
        inviting atmosphere. We also feature live traditional music performances on weekends.
      </p>
    </div>
  );
};

const SignatureDishes = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Signature Dishes
      </p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Indulge in our famous Doro Wat, a spicy chicken stew, or try our vegetarian 
        Beyainatu platter. Don't miss our house-made Tej, a traditional Ethiopian honey wine, 
        perfect for complementing your meal.
      </p>
    </div>
  );
};

const CulturalExperience = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Cultural Immersion
      </p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        At Manyazewal, we offer more than just a meal. Experience traditional Ethiopian 
        coffee ceremonies, learn about our rich culinary history, and enjoy the warmth of 
        Ethiopian hospitality in every visit.
      </p>
    </div>
  );
};

const cards = [
  {
    id: 1,
    content: <LocationInfo />,
    className: "md:col-span-2",
    thumbnail:
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    content: <RestaurantFeatures />,
    className: "col-span-1",
    thumbnail:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    content: <SignatureDishes />,
    className: "col-span-1",
    thumbnail:
      "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    content: <CulturalExperience />,
    className: "md:col-span-2",
    thumbnail:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=3542&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

