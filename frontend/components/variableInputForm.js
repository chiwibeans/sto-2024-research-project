'use client';

import React, { useState, useEffect } from 'react';

const VariableInputForm = ({ questionHistory, getHistory, setGetHistory }) => {
    const [forms, setForms] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const formsPerPage = 1;

    useEffect(() => {
        const initialForm = {
            dep_var: '',
            independents: [],
            id: questionHistory.length + 1,
            status: 'not started',
        };
        setForms([initialForm]);
    }, [questionHistory]);

    const totalPages = Math.ceil(forms.length / formsPerPage);

    const handleDependentChange = (index, e) => {
        const actualIndex = (currentPage - 1) * formsPerPage + index;
        const updatedForms = [...forms];
        updatedForms[actualIndex].dep_var = e.target.value;
        setForms(updatedForms);
    };
    
    const handleIndependentChange = (index, e) => {
        const actualIndex = (currentPage - 1) * formsPerPage + index;
        const inputText = e.target.value;
        const updatedForms = [...forms];
        updatedForms[actualIndex].independents = inputText.split(/[\n,; ]+/).filter(Boolean);
        setForms(updatedForms);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);

        try {
            const response = await fetch('http://127.0.0.1:5001/api/research-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ researchQuestions: forms }),
            });

            if (!response.ok) throw new Error('Failed to process research questions');

            const results = await response.json();
            setGetHistory(!getHistory);

            setForms([
                {
                    dep_var: '',
                    independents: [],
                    id: questionHistory.length + 1,
                    status: 'not started',
                },
            ]);
        } catch (error) {
            console.error('Error submitting research questions:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddForm = () => {
        setForms([
            ...forms,
            {
                dep_var: '',
                independents: [],
                id: questionHistory.length + forms.length + 1,
                status: 'not started',
            },
        ]);
    };

    const handleRemoveForm = (index) => {
        if (forms.length > 1) {
            const updatedForms = forms.filter((_, i) => i !== index);
            setForms(updatedForms);
        }
    };

    const handleClearForm = (index) => {
        const updatedForms = [...forms];
        updatedForms[index] = {
            dep_var: '',
            independents: [],
            id: updatedForms[index].id,
            status: 'not started',
        };
        setForms(updatedForms);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const formsToShow = forms.slice(
        (currentPage - 1) * formsPerPage,
        currentPage * formsPerPage
    );

    const isFormEmpty = (form) =>
        form.dep_var.trim() === '' && form.independents.length === 0;

    const isFormValid = (form) =>
        form.dep_var.trim() !== '' && form.independents.length > 0;

    const allFormsFilled = forms.every(isFormValid);

    return (
        <div className="max-w-[80%] mx-auto mt-10 p-8 bg-white shadow-lg rounded-xl">
            <h1 className="text-3xl font-semibold text-center text-gray-700 mb-6">
                Experiment Design
            </h1>
            {!processing ? (
                <form onSubmit={handleSubmit}>
                    {formsToShow.map((form, index) => (
                        <div key={index} className="mb-6 p-6 border-b border-gray-200 rounded-md">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                                    Experiment {form.id}
                                </h2>
                                <div className="flex items-center gap-x-2 ">
                                    <button
                                        type="button"
                                        onClick={() => handleClearForm(index)}
                                        disabled={isFormEmpty(form)}
                                        className={`px-4 py-2 ${isFormEmpty(form) ? 'bg-yellow-700 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'
                                            } text-white text-sm font-semibold rounded-lg shadow-md`}
                                    >
                                        Clear Data
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveForm(forms.length - 1)}
                                        disabled={forms.length === 1}
                                        className={`px-4 py-2 ${forms.length === 1 ? 'bg-red-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                                            } text-white text-sm font-semibold rounded-lg shadow-md`}
                                    >
                                        Remove Form
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label
                                    htmlFor={`dep_var-${index}`}
                                    className="block text-gray-600 font-medium mb-2"
                                >
                                    Dependent Variable
                                </label>
                                <input
                                    type="text"
                                    id={`dep_var-${index}`}
                                    value={form.dep_var}
                                    onChange={(e) => handleDependentChange(index, e)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter dependent variable"
                                />
                            </div>
                            <div className="mb-6">
                                <label
                                    htmlFor={`independents-${index}`}
                                    className="block text-gray-600 font-medium mb-2"
                                >
                                    Independent Variables (one per line)
                                </label>
                                <textarea
                                    id={`independents-${index}`}
                                    value={form.independents.join('\n')}
                                    onChange={(e) => handleIndependentChange(index, e)}
                                    rows="6"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter independent variables..."
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center justify-between mt-6">
                        <div>
                            <button
                                type="button"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 ${currentPage === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white rounded-lg`}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 ${currentPage === totalPages ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white rounded-lg ml-2`}
                            >
                                Next
                            </button>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={handleAddForm}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Add Form
                            </button>
                            <button
                                type="submit"
                                disabled={!allFormsFilled}
                                className={`px-4 py-2 ${!allFormsFilled ? 'bg-blue-900 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    } text-white rounded-lg`}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <p className="text-center text-gray-600">Processing your form, please wait...</p>
            )}
        </div>
    );
};

export default VariableInputForm;
