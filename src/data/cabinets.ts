export interface CabinetElement {
  id: string;
  name: string;
  width?: number; // mm
  height?: number; // mm
  depth?: number; // mm
  type?: string; // e.g. 'front', 'body', 'back'
}

export interface Cabinet {
  id: string;
  name: string;
  width: number;  // External Width (mm)
  height: number; // External Height (mm)
  depth: number;  // External Depth (mm)
  elements: CabinetElement[];
  standardWidths?: number[]; // Optional list of selectable standard widths
  standardHeights?: number[]; // Optional list of selectable standard heights
  standardDepths?: number[]; // Optional list of selectable standard depths
  lockDepth?: boolean; // Optional flag to lock depth editing
  configurationOptions?: string[]; // Optional list of selectable options (templates) or active options (placed)
  configUnder?: string[]; // Active options in bottom section
  configAbove?: string[]; // Active options in top section
  microwaveSpaceHeight?: number; // Optional microwave niche space height
  ovenSpaceHeight?: number; // Optional oven niche space height
  ovenBaseHeight?: number; // Optional height of the cabinet space below the oven
  fridgeSpaceHeight?: number; // Optional fridge space height
  sinkBackRimHeight?: number; // Optional height for sink rear vertical rim position
  isFullTop?: boolean;
  cornerOrientation?: 'left' | 'right';
  frontWidth?: number;
  bodyColor?: string;
  hasFronts?: boolean;
  width2?: number; // corner cabinets width2
}

export const cabinetTemplates: Cabinet[] = [
  {
    id: "dolna-standard",
    name: "Szafka dolna standardowa",
    width: 600, // Default to 600
    height: 720, // Default to 720
    depth: 530, // Default to 530
    lockDepth: true,
    standardWidths: [150, 200, 300, 400, 450, 500, 600, 800, 900],
    standardHeights: [720, 760, 780],
    configurationOptions: [
      "1 półka",
      "2 półki",
      "3 półki",
      "4 półki",
      "Cargo",
      "1 szuflada",
      "2 szuflady",
      "3 szuflady (2 wysokie jedna niska)"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 720, depth: 530 },
      { id: "bok-prawy", name: "Bok prawy", height: 720, depth: 530 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 510 }, // 530 - 20
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 510 },
      { id: "plecy", name: "Plecy", width: 596, height: 716 },
    ],
  },
  {
    id: "dolna-zlew",
    name: "Szafka zlewowa",
    width: 600,
    height: 720,
    depth: 530,
    lockDepth: true,
    standardWidths: [500, 600, 800, 900, 1000],
    standardHeights: [720, 760, 780],
    configurationOptions: [
      "1 szuflada",
      "2 szuflady (główna + wewnętrzna wycięta)",
      "Drzwi",
      "Para drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 720, depth: 530 },
      { id: "bok-prawy", name: "Bok prawy", height: 720, depth: 530 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 510 },
      { id: "wieniec-gorny-przod-pion", name: "Wieniec górny pionowy (przód)", width: 564, height: 100, depth: 18 },
      { id: "wieniec-gorny-tyl-pion", name: "Wieniec górny pionowy (tył)", width: 564, height: 100, depth: 18 },
      { id: "plecy-18mm", name: "Plecy 18mm", width: 564, height: 250, depth: 18 },
    ],
  },
  {
    id: "dolna-narozna",
    name: "Szafka dolna narożna",
    width: 1020,
    height: 720,
    depth: 530,
    lockDepth: true,
    standardWidths: [1020, 1070, 1120, 1170, 1220],
    standardHeights: [720, 760, 780],
    configurationOptions: [
      "1 półka",
      "Magic Corner",
      "Le Mans",
      "Drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 720, depth: 530 },
      { id: "bok-prawy", name: "Bok prawy", height: 720, depth: 530 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 1034, depth: 510 },
      { id: "wieniec-gorny-przod", name: "Wieniec górny (przód)", width: 1034, depth: 100 },
      { id: "wieniec-gorny-tyl", name: "Wieniec górny (tył)", width: 1034, depth: 100 },
      { id: "plecy", name: "Plecy", width: 1066, height: 716 },
    ],
  },
  {
    id: "dolna-narozna-90",
    name: "Szafka dolna narożna 90 (L)",
    width: 900,
    height: 720,
    depth: 530,
    lockDepth: true,
    standardWidths: [710, 800, 900, 1000],
    standardHeights: [720, 760, 780],
    configurationOptions: [
      "Drzwi łamane",
      "Para drzwi",
      "1 półka",
      "2 półki",
    ],
    elements: [
      // Zostanie nadpisane w generateFixedElements
    ],
  },
  {
    id: "gorna-narozna-90",
    name: "Szafka górna narożna 90 (L)",
    width: 650,
    height: 700,
    depth: 330,
    width2: 650,
    lockDepth: true,
    standardWidths: [650, 750, 800, 850],
    standardHeights: [500, 600, 700, 800, 900, 1000, 1100, 1200],
    configurationOptions: [
      "Drzwi łamane",
      "Para drzwi",
      "1 półka",
      "2 półki",
      "3 półki",
      "4 półki",
      "5 półek",
    ],
    elements: [
      // Zostanie nadpisane w generateFixedElements
    ],
  },

  {
    id: "gorna-plytka",
    name: "Szafka górna płytka",
    width: 600,
    height: 700,
    depth: 330,
    lockDepth: true,
    standardWidths: [300, 400, 450, 500, 600, 800, 900],
    standardHeights: [500, 600, 700, 800, 900, 1000, 1100, 1200],
    standardDepths: [330],
    configurationOptions: [
      "1 półka",
      "2 półki",
      "3 półki",
      "4 półki",
      "5 półek"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 690, depth: 330 },
      { id: "bok-prawy", name: "Bok prawy", height: 690, depth: 330 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 330 }, // 600 - 36
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 330 },
      { id: "plecy", name: "Plecy", width: 596, height: 686 },
    ],
  },
  {
    id: "gorna-gleboka",
    name: "Szafka górna głęboka",
    width: 600,
    height: 400,
    depth: 560,
    lockDepth: true,
    standardWidths: [300, 400, 450, 500, 600, 800, 900],
    standardHeights: [300, 400, 500],
    standardDepths: [560],
    configurationOptions: [
      "1 półka"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 382, depth: 560 }, // height - 18
      { id: "bok-prawy", name: "Bok prawy", height: 382, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 560 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 560 },
      { id: "plecy", name: "Plecy", width: 596, height: 386 }, // height - 14
    ],
  },
  {
    id: "gorna-narozna",
    name: "Szafka górna narożna",
    width: 650,
    height: 700,
    depth: 330,
    lockDepth: true,
    standardWidths: [650, 750, 800, 850, 950],
    standardHeights: [500, 600, 700, 800, 900, 1000, 1100, 1200],
    configurationOptions: [
      "Drzwi",
      "1 półka",
      "2 półki",
      "3 półki",
      "4 półki",
      "5 półek"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 700, depth: 330 },
      { id: "bok-prawy", name: "Bok prawy", height: 700, depth: 330 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 614, depth: 310 },
      { id: "wieniec-gorny-przod", name: "Wieniec górny (przód)", width: 614, depth: 100 },
      { id: "wieniec-gorny-tyl", name: "Wieniec górny (tył)", width: 614, depth: 100 },
      { id: "plecy", name: "Plecy", width: 646, height: 696 },
    ],
  },
  {
    id: "gorna-narozna-gleboka",
    name: "Szafka górna narożna głęboka",
    width: 900,
    height: 700,
    depth: 560,
    lockDepth: true,
    standardWidths: [900, 1000, 1100],
    standardHeights: [300, 400, 500],
    configurationOptions: [
      "Drzwi",
      "1 półka"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 700, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 700, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 864, depth: 540 },
      { id: "wieniec-gorny-przod", name: "Wieniec górny (przód)", width: 864, depth: 100 },
      { id: "wieniec-gorny-tyl", name: "Wieniec górny (tył)", width: 864, depth: 100 },
      { id: "plecy", name: "Plecy", width: 896, height: 696 },
    ],
  },
  {
    id: "dolna-lodowka",
    name: "Słupek na lodówkę",
    width: 600,
    height: 2300, // Standard height for built-in fridge columns
    depth: 560,
    lockDepth: true,
    standardWidths: [],
    standardHeights: [], // Empty to trigger manual slider (230-270cm)
    configurationOptions: [
      "Siłowniki",
      "Drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 2320, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 2320, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 540 },
      { id: "wieniec-srodkowy", name: "Wieniec środkowy (nad lodówką)", width: 564, depth: 540 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 540 },
      { id: "listwa-wzmoc-1", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "listwa-wzmoc-2", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "plecy-gora", name: "Plecy (góra)", width: 596, height: 300 }, // Example height
    ],
  },
  {
    id: "dolna-lodowka-2",
    name: "Słupek cargo",
    width: 600,
    height: 2300,
    depth: 560,
    lockDepth: true,
    standardWidths: [200, 250, 300, 400, 450, 500, 600],
    standardHeights: [],
    configurationOptions: [
      "Siłowniki",
      "Drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 2320, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 2320, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 540 },
      { id: "wieniec-srodkowy", name: "Wieniec środkowy (nad lodówką)", width: 564, depth: 540 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 540 },
      { id: "listwa-wzmoc-1", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "listwa-wzmoc-2", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "plecy-gora", name: "Plecy (góra)", width: 596, height: 300 }, // Example height
    ],
  },
  {
    id: "dolna-lodowka-3",
    name: "Słupek z szufladami wewnętrznymi",
    width: 600,
    height: 2300,
    depth: 560,
    lockDepth: true,
    standardWidths: [300, 400, 450, 500, 600],
    standardHeights: [],
    configurationOptions: [
      "Siłowniki",
      "Drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 2320, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 2320, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 540 },
      { id: "wieniec-srodkowy", name: "Wieniec środkowy (nad szufladami)", width: 564, depth: 540 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 540 },
      { id: "listwa-wzmoc-1", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "listwa-wzmoc-2", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "plecy-gora", name: "Plecy (góra)", width: 596, height: 300 },
    ],
  },
  {
    id: "dolna-piekarnik",
    name: "Słupek na piekarnik",
    width: 600,
    height: 2300,
    depth: 560,
    lockDepth: true,
    standardWidths: [600],
    standardHeights: [], // Changed to empty to trigger manual input + slider
    configurationOptions: [], // Custom handling in UI
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 2070, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 2070, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 540 },
      { id: "wieniec-srodkowy-dol", name: "Wieniec środkowy (pod piekarnikiem)", width: 564, depth: 540 },
      { id: "wieniec-srodkowy-gora", name: "Wieniec środkowy (nad piekarnikiem)", width: 564, depth: 540 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 540 },
      { id: "plecy", name: "Plecy", width: 596, height: 2066 }, // Placeholder
    ],
  },
  {
    id: "dolna-lodowka-4",
    name: "Słupek z półkami wewnętrznymi",
    width: 600,
    height: 2300,
    depth: 560,
    lockDepth: true,
    standardWidths: [200, 250, 300, 400, 450, 500, 600],
    standardHeights: [],
    configurationOptions: [
      "Siłowniki",
      "Drzwi"
    ],
    elements: [
      { id: "bok-lewy", name: "Bok lewy", height: 2320, depth: 560 },
      { id: "bok-prawy", name: "Bok prawy", height: 2320, depth: 560 },
      { id: "wieniec-dolny", name: "Wieniec dolny", width: 564, depth: 540 },
      { id: "wieniec-srodkowy", name: "Wieniec środkowy", width: 564, depth: 540 },
      { id: "wieniec-gorny", name: "Wieniec górny", width: 564, depth: 540 },
      { id: "listwa-wzmoc-1", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "listwa-wzmoc-2", name: "Listwa wzmacniająca", width: 564, height: 100, depth: 18 },
      { id: "plecy-gora", name: "Plecy (góra)", width: 596, height: 300 },
    ],
  },
];
