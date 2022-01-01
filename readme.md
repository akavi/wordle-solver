# Wordle Solver

An attempt to create a script that solves [Worlde](https://www.powerlanguage.co.uk/wordle/)


## Input format

Pass a string representing the output wordle gives you:

🟩: g

🟨: y

⬜: x

Eg: 

🟩⬜⬜🟨⬜: `gxxyx`

⬜🟩🟨⬜⬜: `xgyxx`

🟩🟨🟩⬜🟩: `gygxg`

## Heuristic

Attempts to find the word that partitions the remaining possibility space as evenly as possible.
