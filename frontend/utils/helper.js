function getColorShades(baseColor, opacityLevels) {
    const shades = opacityLevels.map(opacity => {
        return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
    });
    return shades;
}

function getDarkBlueShades(opacity) {
    const baseColor = "#00008B";
    const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${baseColor}${hexOpacity}`;
}


// function transformToDatasets(dataArray) {
//     const datasets = [];
//     const keys = Object.keys(dataArray[0]).filter(key => key !== 'index');
//     const paleColors = [
//         "#FCF9DA",
//         "#E0EBF7",
//         "#D3EDDB",
//         "#F9D7F6",
//         "#D0C3F1",
//         "#E9F9E5",
//         "#CEEEF8",
//         "#FFD7EE",
//         "#FEF1AB"
//     ];

//     // Find the row corresponding to "f1" and its max value
//     const f1Row = dataArray.find(item => item.index.toLowerCase() === 'f1');
//     const f1Values = keys.map(key => parseFloat(f1Row[key]) || 0.0);
//     const maxF1Value = Math.max(...f1Values);

//     // Loop over each key in the data and assign background color
//     keys.forEach((key, keyIndex) => {
//         const data = dataArray.map(item => parseFloat(item[key]) || 0.0); // Collect values for the current key

//         const backgroundColor = dataArray.map((item, i) => {
//             // Find the corresponding row for f1 and check if it has the max value for this key
//             if (item.index.toLowerCase() === 'f1') {
//                 const f1KeyValue = parseFloat(item[key]) || 0.0;
//                 return f1KeyValue === maxF1Value ? '#00008B' : paleColors[keyIndex % paleColors.length];
//             }
//             // For other rows, assign pale colors
//             return paleColors[keyIndex % paleColors.length];
//         });

//         datasets.push({
//             label: key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), // Format label
//             data: data,
//             backgroundColor: backgroundColor, // Conditional background colors
//             borderColor: backgroundColor, // Match border color for consistency
//             borderWidth: 1
//         });
//     });

//     return datasets;
// }


function transformToDatasets(dataArray) {
    const datasets = [];
    const keys = Object.keys(dataArray[0]).filter(key => key !== 'index');
    const paleColors = [
        "#FCF9DA",
        "#E0EBF7",
        "#D3EDDB",
        "#F9D7F6",
        "#D0C3F1",
        "#E9F9E5",
        "#CEEEF8",
        "#FFD7EE",
        "#FEF1AB"
    ];

    // Find the row corresponding to "f1" and its max value
    const f1Row = dataArray.find(item => item.index.toLowerCase() === 'f1');
    const f1Values = keys.map(key => parseFloat(f1Row[key]) || 0.0);
    const maxF1Value = Math.max(...f1Values);

    // Find which key has the maximum value in the "f1" row
    const maxF1KeyIndex = f1Values.indexOf(maxF1Value);

    const backgroundColorMap = {};
    // Loop over each key in the data and assign background color
    keys.forEach((key, keyIndex) => {
        const data = dataArray.map(item => parseFloat(item[key]) || 0.0); // Collect values for the current key

        const backgroundColor = dataArray.map((item, i) => {
            // If we are on the column where "f1" had the maximum value
            if (keyIndex === maxF1KeyIndex) {
                return '#00008B'; // Dark blue for the highlighted column
            }
            // For other columns, assign pale colors
            return paleColors[keyIndex % paleColors.length];
        });

        backgroundColorMap[key] = backgroundColor[0];

        datasets.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), // Format label
            data: data,
            backgroundColor: backgroundColor, // Conditional background colors
            borderColor: backgroundColor, // Match border color for consistency
            borderWidth: 1
        });
    });

    return {
        datasets,
        keys,
        backgroundColorMap
    };
}

function styleTopBars(data, topN = 5) {
    const baseColor = "#00008B"; // Dark blue for top bars
    const paleColors = [
        "#FCF9DA",
        "#E0EBF7",
        "#D3EDDB",
        "#F9D7F6",
        "#D0C3F1",
        "#E9F9E5",
        "#CEEEF8",
        "#FFD7EE",
        "#FEF1AB",
    ];

    // Sort data and get indices of top N bars
    const sortedIndices = data
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value)
        .map(item => item.index);

    const topIndices = sortedIndices.slice(0, topN);

    // Assign colors
    return data.map((_, index) => {
        if (topIndices.includes(index)) {
            return baseColor; // Dark blue for top N bars
        } else {
            // Rotate through the pale colors
            const colorIndex = (index - topN) % paleColors.length;
            return paleColors[colorIndex];
        }
    });
}

export { transformToDatasets, getDarkBlueShades, styleTopBars };
