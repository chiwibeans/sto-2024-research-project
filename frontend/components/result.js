'use client'

import { useState, useEffect } from "react";
import ComparisonChart from "./chart";
import { useParams } from "next/navigation";


export default function Results() {
    const { id } = useParams()
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch(`http://localhost:5001/api/results/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch results');
                }
                const data = await response.json();
                setResults(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load results');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!results) return <div>No results found</div>;

    return (
        <div className="p-6 w-full max-w-[95%] mx-auto flex flex-col gap-y-6 mt-8 bg-white shadow-lg rounded-lg">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">Analysis Results</h2>

            <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Research Question Number: {results[0]}</h3>
                <p className="text-lg text-gray-700"><strong>Dependent Variable:</strong> <span className="text-indigo-600">{results[1]}</span></p>

                <div className="mt-4">
                    <p className="text-lg text-gray-700"><strong>Independent Variables:</strong></p>
                    <p className="px-4 py-3 text-sm text-gray-600 bg-gray-200 rounded-md">{results[2]}</p>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8 flex items-center gap-x-3">
                <h3 className="text-xl font-semibold text-gray-800">Status:</h3>
                <p className="text-lg text-green-700">{results[3]}</p>
            </div>

            <div className="mt-8">
                <ComparisonChart id={id} />
            </div>
        </div>
    );
} 