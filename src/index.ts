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

const getPattern = (splitter, [word, wordSet]) => {
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

const patternApplies = (pattern, [word, wordSet]) => {
    const result = pattern.every(([letter, state], idx) => {
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

const optimalSplitters = (splitters, wordAndSets) => {
    return minBy(splitters, (splitter) => {
        const countByPattern = {};
        wordAndSets.forEach(wordAndSet => {
            const pattern =  getPattern(splitter, wordAndSet);
            countByPattern[pattern] = (countByPattern[pattern] ?? 0) + 1;
        });
        const scores = toPairs(countByPattern).map(([_pattern, count]) => count);
        const score = getScore(splitter, scores, wordAndSets);
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

const getInput = (guess, callback) => {
    return rl.question(`Result: `, (input) => {
        const parsedInput = parseResult(guess, input);
        Result.apply(
            parsedInput,
            (resultPattern) => callback(resultPattern),
            (err) => {
                console.log(err);
                return getInput(guess, callback);
            },
        );
    });
};

const loopGuesses = (guess, splitters, wordAndSets) => {
    if (wordAndSets.length === 1) {
        console.log(`The word: ${wordAndSets[0][0]}`);
        return rl.close();
    } else if (wordAndSets.length < 10) {
        const words = wordAndSets.map(([w]) => w);
        console.log(`Remaining possible words: ${words.join(", ")}`);
    }

    console.log(`Try: ${guess}`);
    return getInput(guess, (resultPattern) => {
        const nextWordAndSets = wordAndSets.filter(wordAndSet => patternApplies(resultPattern, wordAndSet));
        const nextGuess = optimalSplitters(splitters, nextWordAndSets);
        return loopGuesses(nextGuess, splitters, nextWordAndSets);
    });
};

const words = fs.readFileSync("src/potential_answers.txt", 'utf8').split("\n").filter(w => w.length === 5).map(w => w.toLowerCase())

// supposedly the optimal?
const firstGuess = "lares";
loopGuesses(firstGuess, words, words.map((w) => [w, new Set(w.split(""))]));
//console.log(optimalSplitters(enterableWords, answerableWords).slice(0, 10));
