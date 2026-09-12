// Example productions seeded on demand (empty state). Slugs that already
// exist are skipped, so seeding is idempotent.
import type { AgentPersona } from "@/shared/api/personaTypes";
import type { AgentTeam } from "@/shared/api/teamTypes";
import type { AcpRuntime } from "@/shared/api/types";

import { createProductionWithTeam } from "./createProduction";
import type { ProductionContext } from "./productionEvents";

export type ExampleProduction = {
  slug: string;
  name: string;
  format: string;
  aspect: string;
  channelNames: string[];
  context: ProductionContext;
};

export const EXAMPLE_PRODUCTIONS: ExampleProduction[] = [
  {
    slug: "jony",
    name: "Jony",
    format: "microdrama",
    aspect: "9:16",
    channelNames: ["general", "story", "visual", "audio"],
    context: {
      premise:
        "Série vertical de episódios curtos (até 20 s) sobre a origem humana de um vampiro Nosferatu. Ashcombe, vila ficcional no baixo vale do Severn, Inglaterra, 1469–1485. Jony, 9 anos, foge com a irmã Maya e o amigo Gabriel depois que os cavaleiros de Netherwyck queimam a aldeia. Fantasia medieval sem magia explícita.",
      bible:
        "Cada episódio é uma cena única, em primeira pessoa quando possível. O prólogo mata Thomas Miller, pai das crianças. A fuga noturna (EP. 04) é o ponto de virada: as crianças deixam Ashcombe em chamas para trás. Os homens de Netherwyck nunca são identificados em quadro.",
      characters: [
        "Jony (9): protagonista, curioso, corre desde o primeiro quadro",
        "Maya (11): irmã, prática, decide rápido",
        "Gabriel (10): amigo, medroso e leal",
        "Thomas Miller: pai, morre no prólogo",
      ],
      locations: [
        "Ashcombe: vila de madeira e palha no baixo vale do Severn",
        "Floresta do Severn: fuga noturna, lua fria e fogo ao fundo",
        "Netherwyck: castelo dos cavaleiros do javali preto (nunca visto por dentro na 1ª temporada)",
      ],
      visual_style:
        "Realismo sujo, luz natural, câmera na mão. Noite é contraste, não média escura: lua fria por trás fazendo do céu a área mais clara do quadro, fogo laranja numa faixa baixa. Tudo que se levanta contra o céu é silhueta preta.",
      camera_rules:
        "POV de criança: a câmera é a cabeça do Jony, na altura dele. Nunca mostrar mãos, braços, pernas ou roupa do observador em plano de corrida. Proibir espelho, reflexo, água parada e metal polido. Um movimento de câmera por plano.",
      continuity_rules: [
        "As três crianças têm entre 9 e 11 anos",
        "Sem sangue explícito em quadro",
        "O símbolo de Netherwyck é um javali preto",
        "Nunca nomear no prompt o que não pode aparecer em quadro",
      ],
      narrative_rules:
        "Cada episódio termina num gancho físico (porta, som, luz), nunca em diálogo. Fala mínima; quando existir, uma frase curta por personagem. O que a voz diz nunca repete o que a imagem mostra.",
    },
  },
  {
    slug: "memorias",
    name: "Memórias",
    format: "music-video",
    aspect: "16:9",
    channelNames: ["general", "story", "visual"],
    context: {
      premise:
        "Music video: Maia revisita as memórias de um amor com um vampiro. Clipe de 3 minutos cortado na batida, alternando presente (dia, quente) e memória (noite, azul).",
      characters: [
        "Maia: protagonista, 20 e poucos anos, olhar direto para a câmera só no refrão",
        "O vampiro: nunca em plano aberto; mãos, nuca, sombra",
      ],
      visual_style:
        "Presente em luz de fim de tarde, 35 mm, cores quentes. Memória em azul frio, grão forte, 16 mm. Os dois mundos nunca compartilham a mesma paleta no mesmo plano.",
      continuity_rules: [
        "Referência de rosto da Maia é sempre plano de cena, nunca retrato regerado",
        "Lip-sync só em plano fechado (rosto > 40% da altura do quadro)",
      ],
      narrative_rules:
        "A montagem segue a estrutura da música: verso = presente, refrão = memória, ponte = os dois se cruzam.",
    },
  },
];

export async function seedExampleProductions({
  existingSlugs,
  team,
  personas,
  runtimes,
  preferredRuntime,
}: {
  existingSlugs: Set<string>;
  team: AgentTeam | null;
  personas: AgentPersona[];
  runtimes: AcpRuntime[];
  preferredRuntime: string | null | undefined;
}): Promise<{ created: string[]; warnings: string[] }> {
  const created: string[] = [];
  const warnings: string[] = [];
  for (const example of EXAMPLE_PRODUCTIONS) {
    if (existingSlugs.has(example.slug)) continue;
    const result = await createProductionWithTeam({
      ...example,
      team,
      personas,
      runtimes,
      preferredRuntime,
    });
    created.push(result.input.slug);
    warnings.push(...result.warnings);
  }
  return { created, warnings };
}
