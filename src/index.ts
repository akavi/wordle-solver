const fs = require('fs'); 
const {sortBy, zip, sum, toPairs, countBy, find, mean} = require('lodash');
const Result = require('./result.ts');
const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const minsBy = (arr, fn) => {
    if (arr.length === 0) {
        return arr;
    }

    const sorted = sortBy(arr.map(v => [v, fn(v)]), ([_v, k]) => k);
    const minKey = sorted[0][1];
    return sorted.filter(([_v, k]) => k === minKey).map(([v]) => v);
};

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
    return pattern.every(([letter, state], idx) => {
        if (state === State.NO) {
            return !wordSet.has(letter);
        } else if (state === State.PRESENT) {
            return wordSet.has(letter) && word[idx] !== letter;
        } else {
            return word[idx] === letter;
        }
    });
};

// An "optimal" split of the possibility space would be that the possible results evenly split
// ie, each pattern 
const getScore = (splitter, wordAndSets) => {
    const target = wordAndSets.length/Math.pow(splitter.length, 3);

    const countByPattern = countBy(wordAndSets, was => getPattern(splitter, was));
    const scores = toPairs(countByPattern).map(([_pattern, count]) => count);
    return sum(scores.map(c => Math.pow(target - c, 2))) / scores.length;
};

const optimalInput = (inputs, wordAndSets) => {
    if (inputs.length === 0) {
        return null;
    };

    const mins = minsBy(inputs, ([input]) => getScore(input, wordAndSets));
    const solutionMin = find(mins, ([_i, isSolution]) => isSolution);

    return solutionMin ? solutionMin[0] : mins[0][0];
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

const loopGuesses = (guess, inputs, wordAndSets, hardMode = true) => {
    if (wordAndSets.length === 0 || guess == null) {
        console.log(`Dunno`);
        return rl.close();
    } else if (wordAndSets.length === 1) {
        console.log(`The word: ${wordAndSets[0][0]}`);
        return rl.close();
    } else if (wordAndSets.length < 10) {
        const words = wordAndSets.map(([w]) => w);
        console.log(`Remaining possible words: ${words.join(", ")}`);
    }

    console.log(`Try: ${guess}`);
    return getInput(guess, (resultPattern) => {
        const nextWordAndSets = wordAndSets.filter(wordAndSet => patternApplies(resultPattern, wordAndSet));

        const nextWords = nextWordAndSets.map(([w]) => w);
        const solutionSet = new Set(nextWords);
        // this isn't right
        // TODO: in hard mode, we should filter inputs by patternAppplies
        const nextInputs = hardMode ? nextWords.map(w => [w, solutionSet.has(w)]): inputs.map(([w]) => [w, solutionSet.has(w)]);

        const nextGuess = optimalInput(nextInputs, nextWordAndSets);
        return loopGuesses(nextGuess, nextInputs, nextWordAndSets);
    });
};

const howLong = (word, guess, inputs, wordAndSets, hardMode = false) => {
    if (wordAndSets.length === 0 || guess == null) {
        throw new Error("Something went wrong, no answers");
    } else if (wordAndSets.length === 1) {
        return 1;
    }

    const resultPattern = parseResult(guess, getPattern(guess, [word, new Set(word.split(""))])).val;
    if (resultPattern.every(([_, s]) => s === State.POSITIONED)) {
        return 1;
    };

    const nextWordAndSets = wordAndSets.filter(wordAndSet => patternApplies(resultPattern, wordAndSet));

    const nextWords = nextWordAndSets.map(([w]) => w);
    const solutionSet = new Set(nextWords);
    // this isn't right
    // TODO: in hard mode, we should filter inputs by patternAppplies
    const nextInputs = hardMode ? nextWords.map(w => [w, solutionSet.has(w)]): inputs.map(([w]) => [w, solutionSet.has(w)]);

    const nextGuess = optimalInput(nextInputs, nextWordAndSets);
    return 1 + howLong(word, nextGuess, nextInputs, nextWordAndSets, hardMode);
};

program
  .option('-h, --hard_mode', 'enable hard mode');

const options = program.opts()

const inputs = fs.readFileSync("src/potential_inputs.txt", 'utf8').split("\n").map(w => w.trim()).filter(w => w.length === 5).map(w => w.toLowerCase())
const solutions = fs.readFileSync("src/potential_solutions.txt", 'utf8').split("\n").map(w => w.trim()).filter(w => w.length === 5).map(w => w.toLowerCase())

const solutionSet = new Set(solutions);

// supposedly the optimal?
const firstGuess = "raise";
loopGuesses(firstGuess, inputs.map(w => [w, solutionSet.has(w)]), solutions.map((w) => [w, new Set(w.split(""))]), !!options.hard_mode);

