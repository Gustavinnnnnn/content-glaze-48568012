import m1 from "@/assets/model-1.jpg";
import m2 from "@/assets/model-2.jpg";
import m3 from "@/assets/model-3.jpg";
import m4 from "@/assets/model-4.jpg";
import m5 from "@/assets/model-5.jpg";
import m6 from "@/assets/model-6.jpg";
import { contentList } from "./content";

export type Model = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  cover: string;
  bio: string;
  price: number; // monthly
  subscribers: string;
  posts: number;
  gallery: string[];
};

const avatars = [m1, m2, m3, m4, m5, m6];
const names = [
  { name: "Sofia Lima", handle: "sofialima", bio: "Fotografia, viagens e bastidores exclusivos toda semana ✨" },
  { name: "Anna Costa", handle: "annacosta", bio: "Conteúdo lifestyle premium feito com carinho 💛" },
  { name: "Júlia Reis", handle: "juliareis", bio: "Moda, beleza e rotina sem filtro 🌿" },
  { name: "Marina Souza", handle: "marinasz", bio: "Bastidores, ensaios e novidades em primeira mão" },
  { name: "Carol Mendes", handle: "carolmendes", bio: "Criadora de conteúdo • acervo exclusivo no app" },
  { name: "Bia Rocha", handle: "biarocha", bio: "Vídeos novos toda semana, só pra assinantes 🔥" },
];

export const models: Model[] = avatars.map((avatar, i) => {
  const gallery = contentList
    .slice(i * 2, i * 2 + 6)
    .map((c) => c.image)
    .concat(contentList.slice(0, 6).map((c) => c.image))
    .slice(0, 9);
  return {
    id: `m-${i}`,
    name: names[i].name,
    handle: names[i].handle,
    avatar,
    cover: gallery[0],
    bio: names[i].bio,
    price: [19.9, 24.9, 29.9, 19.9, 34.9, 22.9][i],
    subscribers: `${(Math.random() * 40 + 10).toFixed(1)}k`,
    posts: Math.floor(Math.random() * 80 + 30),
    gallery,
  };
});
