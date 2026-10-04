'use client';

import React from 'react';
import { Transformer } from '@/types/grid';
import { ElectricalFeederHierarchyVisualizer } from '@/components/network/ElectricalFeederHierarchyVisualizer';

interface NetworkOverviewProps {
  transformers: Transformer[];
}

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({ transformers }) => {
  return <ElectricalFeederHierarchyVisualizer transformers={transformers} />;
};
