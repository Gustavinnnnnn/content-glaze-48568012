// Deterministic rotating copy — picks one of N variants based on a stable id.
// No randomness, so the same model/video always shows the same text across renders & users.

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const pick = <T,>(arr: T[], id: string): T => arr[hash(id) % arr.length];

// ---- Model bios (5 variants, swapped by name) ----
const MODEL_BIOS = [
  (name: string, age: number) =>
    `Oi amor, sou a ${name}, ${age} anos. 💋 Conteúdo SEM CENSURA todo dia aqui. Vem ser meu VIP que te espero com novidades quentes.`,
  (name: string, age: number) =>
    `${name} • ${age} aninhos 🔥 Aquela menina que você procurava. Fotos e vídeos exclusivos só pros assinantes — bora?`,
  (name: string, age: number) =>
    `Aqui é a ${name} 😈 ${age} anos de pura safadeza. Conteúdo personalizado, chamadas e muito mais. Te respondo no privado 💌`,
  (name: string, age: number) =>
    `${name}, ${age}. 🌶️ Sou bem ousada e gosto de mostrar tudo. Posto novidade toda semana, vem comigo no VIP que você não vai se arrepender.`,
  (name: string, age: number) =>
    `Sou ${name}, ${age} aninhos 💕 Apaixonada por chocar você. Conteúdo só meu, gravado por mim. Acesso liberado pros meus VIP 😉`,
];

// Stable age between 19 and 27
const ageFor = (id: string) => 19 + (hash(id) % 9);

export const getModelBio = (modelId: string, name: string, fallback?: string | null): string => {
  if (fallback && fallback.trim()) return fallback;
  const firstName = (name || "amor").split(" ")[0];
  const age = ageFor(modelId);
  return pick(MODEL_BIOS, modelId)(firstName, age);
};

// ---- Video descriptions (5 variants) ----
const VIDEO_DESCRIPTIONS = [
  "Esse foi só um pedacinho 🔥 No VIP você assiste tudo SEM CORTE e SEM CENSURA. Mais de 10.000 vídeos liberados, novos posts toda semana. Vem aproveitar.",
  "Quer ver o que rolou depois? 😈 Libera seu acesso VIP e descubra TUDO. Acervo completo, sem propaganda, sem espera. Só conteúdo exclusivo.",
  "Você acabou de ver a prévia. A versão completa tá esperando no VIP — junto com milhares de outros vídeos só pra assinantes. Bora desbloquear?",
  "Conteúdo exclusivo das modelos mais quentes do Brasil 🇧🇷✨ Sem censura, sem limite. Assinantes VIP têm acesso ilimitado a TUDO. Não fica de fora.",
  "Isso é só o aperitivo 💋 Dentro do VIP tem mais de 10.000 vídeos liberados, atualizações diárias e zero propaganda. Vem aproveitar agora mesmo.",
];

export const getVideoDescription = (videoId: string, fallback?: string | null): string => {
  if (fallback && fallback.trim()) return fallback;
  return pick(VIDEO_DESCRIPTIONS, videoId);
};
