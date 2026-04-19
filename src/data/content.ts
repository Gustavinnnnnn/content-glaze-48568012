import img1 from "@/assets/content-1.jpg";
import img2 from "@/assets/content-2.jpg";
import img3 from "@/assets/content-3.jpg";
import img4 from "@/assets/content-4.jpg";
import img5 from "@/assets/content-5.jpg";
import img6 from "@/assets/content-6.jpg";

export type ContentItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  badge?: "novo" | "alta";
  views: string;
  premium?: boolean;
};

const pool = [img1, img2, img3, img4, img5, img6];

const titles = [
  "Bastidores que ninguém viu",
  "Paraísos secretos pelo mundo",
  "Velocidade pura na cidade",
  "Sabores que viralizaram",
  "Despertar entre as nuvens",
  "Interiores que inspiram",
  "Histórias por trás da câmera",
  "O luxo redefinido",
  "Momentos que mudaram tudo",
  "A nova era do design",
  "Onde os famosos se escondem",
  "O que ninguém te contou",
];

const categories = ["Lifestyle", "Viagem", "Carros", "Gastronomia", "Natureza", "Design", "Cultura", "Tendências"];

export const contentList: ContentItem[] = Array.from({ length: 24 }).map((_, i) => ({
  id: `c-${i}`,
  title: titles[i % titles.length],
  category: categories[i % categories.length],
  image: pool[i % pool.length],
  badge: i % 5 === 0 ? "alta" : i % 7 === 0 ? "novo" : undefined,
  views: `${(Math.random() * 9 + 1).toFixed(1)}M`,
  premium: i % 3 === 0,
}));

export const trendingChips = [
  "Viagens 2025", "Bastidores", "Lifestyle premium", "Carros de luxo",
  "Receitas virais", "Decoração", "Moda", "Natureza"
];

export const mostSearched = [
  "Bastidores", "Paraísos secretos", "Carros raros", "Receitas premium", "Design moderno"
];
