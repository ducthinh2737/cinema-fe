import React from 'react';

export type DataTab = 'genres' | 'halltypes' | 'seattypes' | 'formats' | 'languages' | 'subtitles' | 'ratings';

export interface MasterDataItem {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  isDeleted: boolean;
  priceMultiplier?: number;
}

export interface TabConfig {
  id: DataTab;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  defaultDescription: string;
}
