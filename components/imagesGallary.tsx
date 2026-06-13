"use client";
import React, { useRef, useState, useEffect } from "react";
import { LayoutGrid } from "@/components/ui/layout-grid";

export function ImageFeatures() {
  const scrollContainerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCards, setTotalCards] = useState(4);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = window.innerWidth - 32;
      const scrollPosition = container.scrollLeft;
      const newIndex = Math.round(scrollPosition / cardWidth);
      setCurrentIndex(Math.min(newIndex, totalCards - 1));
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [totalCards]);

  const scrollToCard = (index) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = window.innerWidth - 32;
      const scrollPosition = index * cardWidth;
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalCards - 1) {
      scrollToCard(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      scrollToCard(currentIndex - 1);
    }
  };

  return (
    <div className="h-auto min-h-screen py-8 w-full">
      {/* Desktop view - Grid layout */}
      <div className="hidden md:block">
        <LayoutGrid cards={cards} />
      </div>
      
      {/* Mobile view - Single image horizontal scroll with minimized height */}
      <div className="block md:hidden px-4">
        <div className="relative">
          {/* Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-hidden scroll-smooth snap-mandatory snap-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex">
              {cards.map((card, index) => (
                <div 
                  key={card.id} 
                  className="w-full flex-shrink-0 snap-start"
                  style={{ width: 'calc(100vw - 32px)' }}
                >
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <div 
                      className="h-[200px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${card.thumbnail})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="text-white">
                          {card.content}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 backdrop-blur-sm transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {currentIndex < totalCards - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 backdrop-blur-sm transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Dots Indicator */}
        <div className="flex justify-center items-center gap-2 mt-4">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={`transition-all duration-300 rounded-full ${
                currentIndex === index
                  ? 'w-6 h-1.5 bg-purple-600'
                  : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const LocationInfo = () => {
  return (
    <div>
      <h3 className="font-bold text-base text-white mb-1">
        Prime Location
      </h3>
      <p className="font-normal text-xs text-neutral-200 leading-tight">
        Heart of Addis Ababa, back of Bole Selam City Mall. Easily accessible for authentic Ethiopian dining.
      </p>
    </div>
  );
};

const RestaurantFeatures = () => {
  return (
    <div>
      <h3 className="font-bold text-base text-white mb-1">
        Unique Features
      </h3>
      <p className="font-normal text-xs text-neutral-200 leading-tight">
        Traditional & modern Ethiopian cuisine. Live music on weekends. Warm cultural atmosphere.
      </p>
    </div>
  );
};

const SignatureDishes = () => {
  return (
    <div>
      <h3 className="font-bold text-base text-white mb-1">
        Signature Dishes
      </h3>
      <p className="font-normal text-xs text-neutral-200 leading-tight">
        Famous Doro Wat, vegetarian Beyainatu platter & house-made Tej honey wine.
      </p>
    </div>
  );
};

const CulturalExperience = () => {
  return (
    <div>
      <h3 className="font-bold text-base text-white mb-1">
        Cultural Immersion
      </h3>
      <p className="font-normal text-xs text-neutral-200 leading-tight">
        Coffee ceremonies, culinary history & warm Ethiopian hospitality.
      </p>
    </div>
  );
};

const cards = [
  {
    id: 1,
    content: <LocationInfo />,
    className: "md:col-span-2",
    thumbnail: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    content: <RestaurantFeatures />,
    className: "col-span-1",
    thumbnail: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    content: <SignatureDishes />,
    className: "col-span-1",
    thumbnail: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    content: <CulturalExperience />,
    className: "md:col-span-2",
    thumbnail: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=3542&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];