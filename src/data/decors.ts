export interface Decor {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
  realWidth: number;  // Szerokość rzeczywista tekstury w mm
  realHeight: number; // Wysokość rzeczywista tekstury w mm
  type: 'drewnopodobne' | 'uni' | 'kamien' | 'beton';
  category: 'laminowana' | 'lakierowana';
}

export const decors: Decor[] = [
  {
    id: 'ciemny-dab',
    name: 'Ciemny Dąb (Test)',
    imageUrl: '/decors/ciemny-dab.jpg',
    thumbnailUrl: '/decors/ciemny-dab.jpg',
    realWidth: 1000, 
    realHeight: 1500,
    type: 'drewnopodobne',
    category: 'laminowana'
  },
  {
    id: 'biel-alpejska',
    name: 'Biel Alpejska',
    imageUrl: '', 
    thumbnailUrl: '',
    realWidth: 1,
    realHeight: 1,
    type: 'uni',
    category: 'laminowana'
  },
  {
    id: 'bialy-lakier',
    name: 'Biały Lakier (Połysk)',
    imageUrl: '', 
    thumbnailUrl: '',
    realWidth: 1,
    realHeight: 1,
    type: 'uni',
    category: 'lakierowana'
  }
];
