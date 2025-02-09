import { Post, Category } from "@/types/blog"

export const posts: Post[] = [
  {
    id: 1,
    title: "A Good Breakfast Should Start with Coffee",
    date: "February 17, 2023",
    excerpt: "Qroin faucibus nec mauris a sodales, sed elementum mi tincidunt. Sed eget viverra egestas nisi in consequat.",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
    category: "Coffee",
    tags: ["CAFE", "BREAKFAST", "MORNING"],
    content: "Full article content here..."
  },
  {
    id: 2,
    title: "The Most Popular Coffee Drinks in the World",
    date: "February 15, 2023",
    excerpt: "Discover the most beloved coffee beverages across different cultures and countries.",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
    category: "Coffee",
    tags: ["CAFE", "DRINKS", "GLOBAL"],
    content: "Full article content here..."
  },
  {
    id: 3,
    title: "Mastering the Art of Pizza Making",
    date: "March 10, 2023",
    excerpt: "Learn the secrets of creating the perfect pizza from scratch.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    category: "Pizzas",
    tags: ["BREAD", "DELICIOUS", "COOKING"],
    content: "Full article content here..."
  },
  {
    id: 4,
    title: "Vegan Curry Recipe That Will Amaze You",
    date: "April 5, 2023",
    excerpt: "A delicious plant-based curry that's packed with flavor and nutrition.",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd",
    category: "Curry",
    tags: ["VEGAN", "SPICY", "HEALTHY"],
    content: "Full article content here..."
  },
  {
    id: 5,
    title: "Quick and Easy Sandwich Ideas",
    date: "May 1, 2023",
    excerpt: "Elevate your sandwich game with these creative combinations.",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af",
    category: "Sandwiches",
    tags: ["BREAD", "QUICK", "LUNCH"],
    content: "Full article content here..."
  },
  {
    id: 6,
    title: "Healthy Snacks for Work",
    date: "June 15, 2023",
    excerpt: "Stay energized throughout your workday with these nutritious snacks.",
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38",
    category: "Snacks",
    tags: ["HEALTHY", "IDEAS", "VEGAN"],
    content: "Full article content here..."
  },
  {
    id: 7,
    title: "Traditional Meat Dishes from Around the World",
    date: "July 20, 2023",
    excerpt: "Explore various cultural meat preparations and cooking techniques.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947",
    category: "Meat",
    tags: ["DELICIOUS", "GLOBAL", "COOKING"],
    content: "Full article content here..."
  },
  {
    id: 8,
    title: "Best Coffee Beans for Home Brewing",
    date: "August 5, 2023",
    excerpt: "Guide to selecting and brewing the perfect cup of coffee at home.",
    image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e",
    category: "Coffee",
    tags: ["CAFE", "BREWING", "MORNING"],
    content: "Full article content here..."
  }
]

export const categories: Category[] = [
  { name: "Coffee", count: 3 },
  { name: "Curry", count: 1 },
  { name: "Pizzas", count: 1 },
  { name: "Sandwiches", count: 1 },
  { name: "Snacks", count: 1 },
  { name: "Meat", count: 1 }
]

export const allTags = [
  "BREAD",
  "CAFE",
  "DELICIOUS",
  "IDEAS",
  "VEGAN",
  "HEALTHY",
  "COOKING",
  "GLOBAL",
  "MORNING",
  "QUICK",
  "SPICY",
  "BREWING",
  "BREAKFAST",
  "LUNCH",
  "DRINKS"
]
