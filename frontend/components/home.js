'use client';

import React, { useState, useEffect } from 'react';
import VariableInputForm from './variableInputForm';

export default function Home() {
  const [questionHistory, setQuestionHistory] = useState([]);
  const [getHistory, setGetHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:5001/api/results');
      if (!response.ok) throw new Error(`Failed to fetch results: ${response.statusText}`);

      const data = await response.json();
      setQuestionHistory(data.data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Failed to load results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [getHistory]);

  const totalPages = Math.ceil(questionHistory.length / rowsPerPage);

  const historyToShow = [...questionHistory]
    .sort((a, b) => b.id - a.id) // Sort in descending order by ID
    .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="p-4 max-w-[95%] w-full mx-auto">
      <h1 className="text-2xl font-bold mb-4">Research Question Analyzer</h1>

      <VariableInputForm
        questionHistory={questionHistory}
        getHistory={getHistory}
        setGetHistory={setGetHistory}
      />

      <div className="my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Processing History</h2>
        {loading ? (
          <p className="text-gray-500">Loading history...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <div className="rounded-lg shadow-lg">
            <table className="min-w-full px-10 border-collapse border border-gray-200 bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b px-6 py-4 text-left font-medium text-gray-700">ID</th>
                  <th className="border-b px-6 py-4 text-left font-medium text-gray-700">Dependent Variable</th>
                  <th className="border-b px-6 py-4 text-left font-medium text-gray-700">Independent Variables</th>
                  <th className="border-b px-6 py-4 text-left font-medium text-gray-700">Status</th>
                  <th className="border-b px-6 py-4 text-left font-medium text-gray-700">Results</th>
                </tr>
              </thead>
              <tbody>
                {historyToShow.length > 0 ? (
                  historyToShow.map((question, index) => (
                    <tr key={question.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 text-gray-800">{question.id}</td>
                      <td className="px-6 py-4 text-gray-800">{question.dependent_var}</td>
                      <td className="px-6 py-4 text-gray-800">{question.independent_vars}</td>
                      <td
                        className={`px-6 py-4 font-bold ${question.status === 'Success'
                            ? 'text-green-600'
                            : question.status === 'error'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                      >
                        {question.status}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-x-2 text-blue-600 underline">
                        <a href={`/results/${question.id}`} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                        |
                        <a href={`http://127.0.0.1:5001/api/download_results/${question.id}`} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="border-b px-6 py-4 text-center text-gray-500">
                      No history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 ${currentPage === 1 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg`}
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 ${currentPage === totalPages ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
