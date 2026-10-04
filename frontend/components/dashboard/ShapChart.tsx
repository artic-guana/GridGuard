import React from 'react';
import { TopFactor } from '@/types/grid';
import { Cpu, Info } from 'lucide-react';

interface ShapChartProps {
  factors: TopFactor[];
}

export const ShapChart: React.FC<ShapChartProps> = ({ factors }) => {
  const maxImpact = Math.max(...factors.map((f) => f.impact), 0.01);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs font-sans">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-700" />
            Model Explanation (SHAP Feature Importance)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Top empirical factors influencing XGBoost probability prediction
          </p>
        </div>
        <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 rounded-sm text-[11px] font-mono font-bold text-sky-800">
          SHAP v0.42
        </span>
      </div>

      <div className="space-y-3.5 my-2">
        {factors.map((item, index) => {
          const pct = Math.round((item.impact / maxImpact) * 100);
          return (
            <div key={index} className="space-y-1 font-sans">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">
                  {item.feature}
                </span>
                <span className="font-mono text-slate-600 text-[11px] font-bold">
                  +{item.impact.toFixed(2)} SHAP delta
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden flex">
                <div
                  className="h-full bg-sky-700 rounded-sm transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <Info className="w-3.5 h-3.5 text-sky-700 shrink-0" />
        <span>SHAP values quantify individual feature contribution to loss classification score.</span>
      </div>
    </div>
  );
};
