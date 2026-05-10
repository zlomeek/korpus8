export interface Decor {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
  edgeImageUrl?: string; // Tekstura obrzeża
  realWidth: number;  // Szerokość rzeczywista tekstury w mm
  realHeight: number; // Wysokość rzeczywista tekstury w mm
  edgeRealWidth?: number; // Szerokość rzeczywista tekstury obrzeża
  edgeRealHeight?: number; // Wysokość rzeczywista tekstury obrzeża
  type: 'drewnopodobne' | 'uni' | 'kamien' | 'beton';
  category: 'laminowana' | 'lakierowana' | 'blat';
  color?: string; // Dominujący kolor lub kolor dla krawędzi
}

export const decors: Decor[] = [
  {
    id: 'ciemny-dab',
    name: 'Ciemny Dąb (Test)',
    imageUrl: '/decors/ciemny-dab.jpg',
    thumbnailUrl: '/decors/ciemny-dab.jpg',
    edgeImageUrl: '/decors/ciemny-dab-edge.png',
    realWidth: 1000,
    realHeight: 1500,
    edgeRealWidth: 1000,
    edgeRealHeight: 250,
    type: 'drewnopodobne',
    category: 'laminowana',
    color: '#4a3728' // Ciemny brąz
  },
  {
    id: 'biel-alpejska',
    name: 'Biel Alpejska',
    imageUrl: '/decors/biel-alpejska.png',
    thumbnailUrl: '/decors/biel-alpejska.png',
    realWidth: 2000,
    realHeight: 2000,
    type: 'uni',
    category: 'laminowana',
    color: '#ffffff'
  },
  {
    id: 'bialy-lakier',
    name: 'Biały Lakier (Połysk)',
    imageUrl: '/decors/bialy-lakier.png',
    thumbnailUrl: '/decors/bialy-lakier.png',
    realWidth: 2000,
    realHeight: 2000,
    type: 'uni',
    category: 'lakierowana',
    color: '#ffffff'
  },
  {
    id: 'dab-jasny',
    name: 'Dąb Jasny',
    imageUrl: '/decors/jasnydabtest.png',
    thumbnailUrl: '/decors/jasnydabtest.png',
    edgeImageUrl: '/decors/dab-jasny-edge.png',
    realWidth: 1000,
    realHeight: 1500,
    edgeRealWidth: 1000,
    edgeRealHeight: 250,
    type: 'drewnopodobne',
    category: 'laminowana',
    color: '#d2b48c'
  },
  {
    id: 'dab-ciemny-2',
    name: 'Dąb Ciemny 2',
    imageUrl: '/decors/ciemnydab2.png',
    thumbnailUrl: '/decors/ciemnydab2.png',
    realWidth: 1000,
    realHeight: 1500,
    type: 'drewnopodobne',
    category: 'laminowana',
    color: '#4a3728'
  },
  {
    id: 'marmur-cremona',
    name: 'Marmur Cremona',
    imageUrl: '/decors/marmur-cremona.png',
    thumbnailUrl: '/decors/marmur-cremona.png',
    edgeImageUrl: '/decors/marmur-cremona-edge.png',
    realWidth: 1000,
    realHeight: 1500,
    edgeRealWidth: 1000,
    edgeRealHeight: 250,
    type: 'kamien',
    category: 'blat',
    color: '#f5f5f5'
  },
  {
    id: 'antracyt',
    name: 'Antracyt',
    imageUrl: '/decors/biel-alpejska.png',
    thumbnailUrl: '/decors/biel-alpejska.png',
    realWidth: 2000,
    realHeight: 2000,
    type: 'uni',
    category: 'laminowana',
    color: '#3A4145'
  },
  {
    id: 'beton-blat',
    name: 'Beton Jasny (Blat)',
    imageUrl: '/decors/beton-blat.png',
    thumbnailUrl: '/decors/beton-blat.png',
    realWidth: 1000,
    realHeight: 1000,
    type: 'beton',
    category: 'blat',
    color: '#808080'
  }
];
