'use client'

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { transformToDatasets } from '@/utils/helper';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels);

const ComparisonChart = ({ id }) => {
    const [data, setData] = useState(null);
    const [lastIndexData, setLastIndexData] = useState(null);
    const [results2, setResults2] = useState(null);
    const [backgroundColorMap, setBackgroundColorMap] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`http://127.0.0.1:5001/metrics?result_id=${id}`);
                const d = await response.json();
                const data = d.default;

                const filteredData = data.slice(0, -1);
                const labels = filteredData.map(item => item.index) || [];
                const lastData = data[data.length - 1];
                const TansformData = transformToDatasets(filteredData);

                setData({
                    labels,
                    datasets: TansformData.datasets,
                });
                setBackgroundColorMap(TansformData.backgroundColorMap);

                const models = TansformData.keys.join(',');
                const filename = 'feature_importance';

                const featureResponse = await fetch(
                    `http://127.0.0.1:5001/metrics?filename=${filename}&models=${models}&result_id=${id}`
                );
                const featureData = await featureResponse.json();

                setResults2(featureData);
                setLastIndexData(lastData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [id]);

    if (!data || !results2) return <div>Loading...</div>;

    return (
        <div className='w-full'>
            <h2>Model Comparison</h2>

            <Bar
                data={data}
                options={{
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Comparison of Logistic Regression and Random Forest Metrics',
                        },
                        datalabels: {
                            display: true,
                            color: 'black',
                            align: 'top',
                            anchor: 'end',

                            formatter: (value) => {
                                // Check if value is a valid number (and not null or undefined)
                                if (value != null && !isNaN(value)) {
                                    return value.toFixed(2);
                                }
                                return ''; // Return empty string if value is invalid
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                        },
                    },
                }}
            />


            {lastIndexData && (
                <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8">
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-40">{lastIndexData.index}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-40">Logistic Regression:</span>
                            <p className="text-gray-800">{lastIndexData.logistic_regression}</p>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium text-gray-600 w-40">Random Forest:</span>
                            <p className="text-gray-800">{lastIndexData.random_forest}</p>
                        </div>
                    </div>
                </div>
            )}


            {results2 && Object.keys(results2).map((modelName, index) => {
                const result = results2[modelName]; // Get the data for the specific model
                const labels = result.map(item => item.feature);
                const importance = result.map(item => item.importance);
                const chartData = {
                    labels,
                    datasets: [
                        {
                            label: `${modelName} Feature Importance`, // Dynamically set the model name in the label
                            data: importance,
                            backgroundColor: backgroundColorMap[modelName],
                        },
                    ],
                };

                return (
                    <div key={index} className='px-3 mx-auto max-w-[95%] w-full'>
                        <Bar
                            data={chartData}
                            options={{
                                indexAxis: 'y',
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    title: {
                                        display: true,
                                        text: `${modelName} Feature Importance`,
                                        font: {
                                            size: 16,
                                        },
                                    },
                                    datalabels: {
                                        display: true,
                                        color: backgroundColorMap[modelName] === "#00008B" ? 'white' :'black',
                                        align: 'left',
                                        anchor: 'end',
                                        formatter: (value) => {
                                            if (value != null && !isNaN(value)) {
                                                return value.toFixed(3);
                                            }
                                            return '';
                                        },
                                    },
                                },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function (value) {
                                                if (value != null && !isNaN(value)) {
                                                    return value.toFixed(3);
                                                }
                                                return '';
                                            },
                                        },
                                        grid: {
                                            display: false,
                                        },
                                    },
                                    y: {
                                        beginAtZero: true,
                                        grid: {
                                            display: false,
                                        },
                                    },
                                },
                            }}
                        />
                    </div>
                );
            })}

        </div>
    );
};

export default ComparisonChart;
