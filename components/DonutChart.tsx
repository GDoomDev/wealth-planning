import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';

interface DonutChartProps {
    data: { name: string; value: number; fill?: string }[];
    totalLabel: string;
    totalValue?: number;
    colors: string[];
    height?: number | string;
    innerRadius?: number | string;
    outerRadius?: number | string;
    showLegend?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({
    data,
    totalLabel,
    totalValue,
    colors,
    height = 300,
    innerRadius = '70%',
    outerRadius = '90%',
    showLegend = true
}) => {

    const calculatedTotal = totalValue ?? data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="relative w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={5}
                        dataKey="value"
                        cornerRadius={10}
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        }}
                        itemStyle={{ color: '#333', fontSize: '12px', fontWeight: 600 }}
                    />
                    {showLegend && (
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value, entry: any) => (
                                <span className="text-slate-600 text-xs font-medium ml-1">{value}</span>
                            )}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-sm font-medium text-slate-400 mb-1">{totalLabel}</span>
                <span className="text-3xl font-bold text-slate-800 tracking-tight">
                    {formatCurrency(calculatedTotal).split(',')[0]}
                    <span className="text-lg text-slate-500">,{formatCurrency(calculatedTotal).split(',')[1]}</span>
                </span>
            </div>
        </div>
    );
};

export default DonutChart;
