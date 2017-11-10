var _ = require('underscore');

var arrayAverage = (arr) => {
    return _.reduce(arr, (num1, num2) => {
        return num1 + num2;
    }, 0) / (arr.length === 0 ? 1 : arr.length);
};

// https://stackoverflow.com/questions/7342957/how-do-you-round-to-1-decimal-place-in-javascript
// function round(value, precision) {
//     var multiplier = Math.pow(10, precision || 0);
//     return Math.round(value * multiplier) / multiplier;
// }
// ... usage ...
// round(12345.6789, 2) // 12345.68
// round(12345.6789, 1) // 12345.7

module.exports = {arrayAverage};