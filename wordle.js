const fs = require('fs'); 
const {minBy, zip, sum} = require('lodash');
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


const State = {
    NO: "NO",
    PRESENT: "PRESENT",
    POSITIONED: "POSITIONED",
}

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
    if (log) {
        //console.log("pattern", pattern, word, result);
    }
    return result;
};

const isWin = (pattern) => {
    return pattern.every(([_l, s]) => s === State.POSIITIONED);
};

// An "optimal" split of the possibility space would be that the possible results evenly split
// ie, each pattern 
const getScore = (cardinalities, words, patterns) => {
    const target = words.length/patterns.length;
    const scores = cardinalities.map(c => [c, Math.abs(target - c, 2)]);
    const result = sum(cardinalities.map(c => Math.pow(target - c, 2))) / cardinalities.length;
    return result;
};

const optimalSplitter = (splitters, words) => {
    const splitterPatterns = splitters.map(s => [s, generatePatterns(s)]);
    return minBy(splitterPatterns, ([splitter, patterns]) => {
        const scores = patterns.map((pattern) => {
            return words.filter(word => patternApplies(pattern, word)).length;
        }).filter(score => score !== 0)
        const score = getScore(scores, words, patterns);
        console.log({splitter, score});
        return score;
    })[0];
};

const parseResult = (guess, resultInput) => {
    const zipped = zip(guess.split(""), resultInput.trim().split(""));
    return zipped.map(([guessLetter, resultLetter]) => {
        if (resultLetter === "g") {
            return [guessLetter, State.POSITIONED];
        } else if (resultLetter === "y") {
            return [guessLetter, State.PRESENT];
        } else if (resultLetter === "x") {
            return [guessLetter, State.NO];
        }
    });
};

const loopGuesses = (guess, splitters, words) => {
    if (words.length === 1) {
        return console.log(`The Word: ${words[0]}`);
    }
    console.log(`Try: ${guess}`);
    return rl.question(`Result: `, (resultInput) => {
        const resultPattern = parseResult(guess, resultInput);
        if (isWin(resultPattern)) {
            return;
        }

        const nextWords = words.filter(word => patternApplies(resultPattern, word, true));
        console.log(`Had ${words.length} possibilities`);
        console.log(`Down to ${nextWords.length} possibilities`);
        if (nextWords.length < 15) {
            console.log("possibilities", nextWords);
        }
        const nextGuess = optimalSplitter(splitters, nextWords);
        return loopGuesses(nextGuess, splitters, nextWords);
    });
};

const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
const eligibleWords = words.filter(w => w.length === 4).map(w => w.toLowerCase())
const firstGuess = "stag";
//loopGuesses(firstGuess, eligibleWords, eligibleWords);
console.log(optimalSplitter(eligibleWords, eligibleWords));
