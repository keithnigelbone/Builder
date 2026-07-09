import type { BuildCategoryId } from '../types';

/**
 * Curated, art-direction-compliant scene templates — the image-prompt
 * authoring path for builds Claude didn't author (the deterministic fallback
 * plan, which is everything the hosted site runs). Each scene follows
 * App/src/ai/artDirection.ts to the letter: physical subject + clothing,
 * both hands doing something specific, a named Indian location with physical
 * detail, framing per the people/infrastructure rules, aerials carrying
 * their own colour notes. tests/unit/data/sceneTemplates.test.ts enforces
 * the "Never use" phrase list mechanically.
 *
 * Slides is deliberately absent (product decision — see the 2026-07-08
 * hosted-media spec).
 */
export type SceneCategory = Exclude<BuildCategoryId, 'slides'>;

export interface ArtDirectedScene {
  imageSubject: string;
  imageAction: string;
  imageLocation: string;
  imageFraming: string;
  imageIsAerial?: boolean;
  imageColourNotes?: string;
}

export const SCENE_TEMPLATES: Record<SceneCategory, ArtDirectedScene[]> = {
  website: [
    {
      imageSubject: 'A grid engineer in her forties, navy work shirt and hard hat, sleeves rolled to the forearm',
      imageAction: 'both hands torquing a junction bolt on a solar panel frame with a long-handled wrench',
      imageLocation: 'red-brown Rajasthan earth, dry scrubland with neem trees, panel rows receding behind her',
      imageFraming: 'medium close-up, slight low angle, subject offset left, soft panel edge in the foreground',
    },
    {
      imageSubject: 'A solar farm of long panel rows with a single service track cutting through',
      imageAction: 'two maintenance workers walking the track, one steadying a panel lid with both hands',
      imageLocation: 'flat semi-arid land outside Jodhpur, panels extending to the horizon line',
      imageFraming: 'true top-down aerial, wide enough that the rows read as a repeating grid',
      imageIsAerial: true,
      imageColourNotes: 'steel-blue panels and red-brown earth',
    },
    {
      imageSubject: 'A fibre technician in a grey polo and climbing harness, cable spool at his hip',
      imageAction: 'both hands splicing a fibre strand into a rooftop junction box',
      imageLocation: 'a Mumbai apartment rooftop at dusk, water tanks and antenna masts around him, sodium lights below',
      imageFraming: 'medium close-up, slight low angle, junction box anchoring the foreground',
    },
  ],
  'app-screens': [
    {
      imageSubject: 'A young woman in a mustard kurta, phone in hand, canvas tote over one shoulder',
      imageAction: 'one hand holding her phone to a stall QR stand, the other steadying a bag of tomatoes',
      imageLocation: 'a Chennai vegetable market at morning, wet stone floor, stacked produce crates',
      imageFraming: 'medium close-up, slight low angle, produce crate softly out of focus in the foreground',
    },
    {
      imageSubject: 'A delivery rider in a rain shell and full-face helmet with the visor up',
      imageAction: 'both thumbs confirming a route on a handlebar-mounted phone',
      imageLocation: 'a Bengaluru side street in light monsoon rain, wet tarmac reflecting shop signs',
      imageFraming: 'medium close-up, slight low angle, handlebar mirror blurred in the foreground',
    },
    {
      imageSubject: 'A kirana shop owner in a checked shirt, reading glasses pushed up his forehead',
      imageAction: 'one hand scanning a barcode with his phone, the other steadying the jar on the shelf',
      imageLocation: 'a Jaipur kirana store, floor-to-ceiling shelves of labelled jars and sacks of grain',
      imageFraming: 'medium close-up, slight low angle, shelf edge anchoring the foreground',
    },
  ],
  'social-media': [
    {
      imageSubject: "A silk weaver's hands, forearms bare, cotton thread bracelet on one wrist",
      imageAction: 'both hands guiding a shuttle through the warp threads of a handloom',
      imageLocation: 'a Kanchipuram weaving workshop, morning light raking across stretched crimson silk',
      imageFraming: 'intimate close-up on the hands, slight low angle, loom frame soft in the foreground',
    },
    {
      imageSubject: 'A chai vendor in a rolled-sleeve flannel shirt, steel kettle blackened at the base',
      imageAction: 'both hands pulling a long pour of chai between two steel tumblers',
      imageLocation: 'a Kolkata street corner at dawn, hand-painted shop shutters behind the stall',
      imageFraming: 'medium close-up, slight low angle, steam catching the light, tumbler rim in the foreground',
    },
    {
      imageSubject: 'A lantern seller in a printed cotton sari, marigold garland over one arm',
      imageAction: 'both hands stringing a line of paper lanterns between two bamboo poles',
      imageLocation: 'the Varanasi ghats at first light, stone steps and moored boats behind her',
      imageFraming: 'medium close-up, slight low angle, an unlit lantern soft in the foreground',
    },
  ],
  motion: [
    {
      imageSubject: 'A wind-farm technician in an orange jumpsuit and work gloves',
      imageAction: 'both gloved hands turning a turbine base valve wheel',
      imageLocation: 'coastal Gujarat wind farm, turbine towers along the shoreline, salt haze over the water',
      imageFraming: 'medium close-up, slight low angle, valve wheel anchoring the foreground',
    },
    {
      imageSubject: 'A white electric car at a charging bay, charge port open',
      imageAction: "a commuter's both hands clicking the charging connector into the port",
      imageLocation: 'a Pune apartment-block basement garage, painted bay lines and numbered pillars',
      imageFraming: 'medium close-up, slight low angle, charging cable curving through the foreground',
    },
    {
      imageSubject: 'A container terminal of stacked containers and gantry cranes over berthed ships',
      imageAction: 'one crane mid-lift, a container suspended over the stack while a spotter signals with both arms',
      imageLocation: 'Nhava Sheva port outside Mumbai, wharf extending to the water line',
      imageFraming: 'true top-down aerial, wide enough that the container rows read as a colour grid',
      imageIsAerial: true,
      imageColourNotes: 'teal and rust-orange containers against grey wharf concrete',
    },
  ],
  video: [
    {
      imageSubject: 'A plant supervisor in a khaki uniform and white hard hat, lanyard tucked into a chest pocket',
      imageAction: 'both hands unrolling a schematic across a steel walkway railing',
      imageLocation: 'a refinery gantry outside Jamnagar at dawn, pipework receding into haze',
      imageFraming: 'medium close-up, slight low angle, railing anchoring the foreground',
    },
    {
      imageSubject: 'A store associate in a navy polo, sleeves pushed to the elbow',
      imageAction: 'both hands pinning a festive garland across a shelf-edge display',
      imageLocation: 'a Jaipur retail store at opening hour, aisles of stacked fabric bolts behind her',
      imageFraming: 'medium close-up, slight low angle, shelf edge soft in the foreground',
    },
    {
      imageSubject: 'A turbine blade on a flatbed trailer turning onto a coastal service jetty',
      imageAction: 'a ground crew guiding the blade with both arms raised in signal',
      imageLocation: 'the Gujarat shoreline at low tide, turbine towers along the water line',
      imageFraming: 'true top-down aerial, wide enough to show the full blade length',
      imageIsAerial: true,
      imageColourNotes: 'white blade, teal shallows and wet grey sand',
    },
  ],
};

/**
 * Stable pick: the same prompt keeps its scene across refinements (no image
 * churn on refine), while different prompts spread across the library.
 */
export function pickSceneTemplate(category: SceneCategory, seedText: string): ArtDirectedScene {
  const templates = SCENE_TEMPLATES[category];
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  return templates[hash % templates.length];
}
