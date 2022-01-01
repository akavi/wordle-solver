const fs = require('fs'); 
const {minBy, zip, sum, toPairs, sortBy} = require('lodash');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const cartesian = (arrays) => {
    const [head, ...rest] = arrays;
    if (head == undefined) {
        return [[]];
    }

    return head.flatMap(val => cartesian(rest).map(tail => [val, ...tail]));
};

const geometricMean = (values) => {
    if (values.length === 1) {
        return values[0];
    };

    const [head, ...rest] = values;
    return Math.pow(head, 1/values.length) * Math.pow(geometricMean(rest), (values.length - 1)/values.length);
};


const success  = (val) => ({type: "success", val });
const error  = (val) => ({type: "error", val });
const resultMap = (result, fn) => {
    if (result.type === "error") {
        return result;
    };

    return success(fn(result.val));
};

const resultFlatMap = (result, fn) => {
    if (result.type === "error") {
        return result;
    };

    return fn(result.val);
};

const resultCollect = (results) => {
    if (results.length === 0) {
        return success([]);
    };

    const [head, ...rest] = results;
    return resultFlatMap(head, (head) => resultMap(resultCollect(rest), (rest) => [head, ...rest]));
};

const resultApply = (result, successFn, errFn) => {
    if (result.type === "success") {
        return successFn(result.val);
    } else {
        return errFn(result.val);
    };
};

const State = {
    NO: "NO",
    PRESENT: "PRESENT",
    POSITIONED: "POSITIONED",
}

// An "optimal" split of the possibility space would be that the possible results evenly split
// ie, each pattern 
const getScore = (splitter, cardinalities, words) => {
    const target = words.length/Math.pow(splitter.length, 3);
    return sum(cardinalities.map(c => Math.pow(target - c, 2))) / cardinalities.length;
};

const getPattern = (splitter, word) => {
    const wordSet = new Set(word.split(""));
    return splitter.split("").map((splitLetter, idx) => {
        if (splitLetter === word[idx]) {
            return "g";
        } else if (wordSet.has(splitLetter)) {
            return "y";
        } else {
            return "x";
        }
    }).join("");
};

const generatePatterns = (word) => {
    return cartesian(word.split("").map(letter => [[letter, State.NO], [letter, State.PRESENT], [letter, State.POSITIONED]]));
};

const patternApplies = (pattern, word, log) => {
    const result = pattern.every(([letter, state], idx) => {
        const wordSet = new Set(word.split(""));
        if (state === State.NO) {
            return !wordSet.has(letter);
        } else if (state === State.PRESENT) {
            return wordSet.has(letter) && word[idx] !== letter;
        } else {
            return word[idx] === letter;
        }
    });
    return result;
};


const optimalSplitters = (splitters, words) => {
    return sortBy(splitters, (splitter) => {
        const countByPattern = {};
        words.forEach(word => {
            const pattern =  getPattern(splitter, word);
            countByPattern[pattern] = (countByPattern[pattern] ?? 0) + 1;
        });
        const scores = toPairs(countByPattern).map(([_pattern, count]) => count);
        const score = getScore(splitter, scores, words);
        return score;
    });
};

const parseResult = (guess, resultInput) => {
    const zipped = zip(guess.split(""), resultInput.trim().split(""));
    return resultCollect(zipped.map(([guessLetter, resultLetter]) => {
        if (resultLetter === "g") {
            return success([guessLetter, State.POSITIONED]);
        } else if (resultLetter === "y") {
            return success([guessLetter, State.PRESENT]);
        } else if (resultLetter === "x") {
            return success([guessLetter, State.NO]);
        } else {
            return error("Invalid format. Use \"g\" for green, \"y\" for yellow, and \"x\" for grey/black");
        }
    }));
};

const parseInput = (input) => {
    const inputWords = input.split(" ");
    if (!(inputWords.length === 2))  {
        return error("Please enter both the word you inputted and the result code");
    }

    const chosenGuess = success(inputWords[0]);
    const resultPattern = resultFlatMap(chosenGuess, (chosenGuess) => parseResult(chosenGuess, inputWords[1]));
    return resultCollect([chosenGuess, resultPattern]);
};

const getInput = (callback) => {
    return rl.question(`Result: `, (input) => {
        const parsedInput = parseInput(input);
        resultApply(
            parsedInput,
            ([chosenGuess, resultPattern]) => callback(chosenGuess, resultPattern),
            (err) => {
                console.log(err);
                return getInput(callback);
            },
        );
    });
};

const loopGuesses = (guesses, splitters, words) => {
    if (words.length === 1) {
        console.log(`The word: ${words[0]}`);
        return rl.close();
    }

    console.log(`Try: ${guesses.join(", ")}`);
    return getInput((chosenGuess, resultPattern) => {
        const nextWords = words.filter(word => patternApplies(resultPattern, word, true));
        if (nextWords.length < 10) {
            console.log(nextWords);
        }
        const nextGuesses = optimalSplitters(splitters, nextWords).slice(0, 5);
        return loopGuesses(nextGuesses, splitters, nextWords);
    });
};

const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
const eligibleWords = words.filter(w => w.length === 5).map(w => w.toLowerCase())

// supposedly the optimal?
const firstGuess = "raise";
loopGuesses(firstGuess, eligibleWords, eligibleWords);
