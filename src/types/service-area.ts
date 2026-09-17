export type ServiceAreaView = {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
};

export type SaveServiceAreasResult = { ok: boolean; message?: string };
