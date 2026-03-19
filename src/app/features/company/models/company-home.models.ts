export interface PersonCard {
  name: string;
  subtitle: string;
  imageUrl: string;
}

export interface ImageTile {
  id: string;
   publicCampusId?: string;   
  publicCompanyId?: string;
  imageUrl: string | null;
  alt: string;
}
