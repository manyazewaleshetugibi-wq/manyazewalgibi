
import React from 'react';
import { ChevronRight, ChefHat, Star, Clock, Menu, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function HeroSection() {
  const featuredDishes = [




    { 
      name: "Juices", 
      image: "/menu/juices.jpg", 
      description: "A selection of freshly squeezed juices made from seasonal fruits, packed with natural flavor and nutrients." ,
      tag: "Chef's Special"

    },
    { 
      name: "Fosesse", 
      image: "/menu/FOSESSE copy.jpg", 
      description: "A hearty Ethiopian dish made with lightly fermented dough, offering a tangy and unique flavor." ,
      tag: "Chef's Special"

    },  
    { 
      name: "Special Salad", 
      image: "/menu/SPECIAL SALAD.jpg", 
      description: "A vibrant mix of fresh greens, vegetables, and house dressing, perfect for a light and refreshing meal." ,
      tag: "Chef's Special"

    }

  ];

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-amber-100/30 via-orange-100/20 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-gradient-to-tr from-orange-100/30 via-amber-50/20 to-transparent rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="relative">
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-16 pb-12 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left column - Text content */}
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-wrap gap-4">
                <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-900 text-sm font-medium">
                  <Clock className="w-4 h-4 mr-2" />
                  Open until 10:00 PM
                </div>
                <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-800 text-sm font-medium">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current text-purple-900" />
                    ))}
                    <span className="ml-2 text-purple-900">4.9</span>
                  </div>
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
              Experience Ethiopian Cuisine
                <span className="block text-amber-600 mt-2 animate-pulse text-purple-900">Manyazewal Eshetu Gibi</span>
              </h1>
              
              <p className="text-lg text-gray-600 max-w-lg">
                Discover authentic Ethiopian flavors in a modern setting. Each dish tells a story of tradition, spice, and passion.
              </p>
              
              <div className="flex flex-wrap items-center gap-8">
                <button className="group inline-flex items-center px-8 py-4 bg-purple-900 text-white rounded-full font-medium hover:bg-amber-700 transform transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <Link href="/menu">
                    View Menu
                  </Link>
                </button>
              
              </div>
            </div>

            {/* Right column - Featured dishes */}
            <div className="relative mt-8 lg:mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-slide-up">
                {featuredDishes.map((dish, index) => (
                  <div
                    key={index}
                    className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-white/90 rounded-full text-sm font-medium text-amber-600">
                          {dish.tag}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                        {dish.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {dish.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Link href="/menu" className="flex items-center gap-2">
                          <span className="text-purple-900 font-medium ">Explore Dish</span>
                          <ChevronRight className="w-5 h-5 text-amber-600 transform transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;