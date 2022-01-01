const fs = require('fs'); 
const {minBy, zip, sum, toPairs, sortBy} = require('lodash');
const Result = require('./result.ts');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const State = {
    NO: "NO",
    PRESENT: "PRESENT",
    POSITIONED: "POSITIONED",
}

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

// An "optimal" split of the possibility space would be that the possible results evenly split
// ie, each pattern 
const getScore = (splitter, cardinalities, words) => {
    const target = words.length/Math.pow(splitter.length, 3);
    return sum(cardinalities.map(c => Math.pow(target - c, 2))) / cardinalities.length;
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
    return Result.collect(zipped.map(([guessLetter, resultLetter]) => {
        if (resultLetter === "g") {
            return Result.success([guessLetter, State.POSITIONED]);
        } else if (resultLetter === "y") {
            return Result.success([guessLetter, State.PRESENT]);
        } else if (resultLetter === "x") {
            return Result.success([guessLetter, State.NO]);
        } else {
            return Result.error("Invalid format. Use \"g\" for green, \"y\" for yellow, and \"x\" for grey/black");
        }
    }));
};

const parseInput = (input) => {
    const inputWords = input.split(" ");
    if (!(inputWords.length === 2))  {
        return Result.error("Please enter both the word you inputted and the result code");
    }

    const chosenGuess = Result.success(inputWords[0]);
    const resultPattern = Result.flatMap(chosenGuess, (chosenGuess) => parseResult(chosenGuess, inputWords[1]));
    return Result.collect([chosenGuess, resultPattern]);
};

const getInput = (callback) => {
    return rl.question(`Result: `, (input) => {
        const parsedInput = parseInput(input);
        Result.apply(
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
const firstGuess = ["raise"];
loopGuesses(firstGuess, eligibleWords, eligibleWords);
