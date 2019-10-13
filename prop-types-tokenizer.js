class PropTypesTokenizer {
    constructor() {
        this.input = "";
        this.indexOfLastToken = 0;
        this.index = 0;
        this.line = 1;
        this.column = 1;
        this.currentToken = null;
    }

    setInput(input) {
        this.input = input;
        this.indexOfLastToken = 0;
        this.index = 0;
        this.line = 1;
        this.column = 1;
        this.currentToken = null;
    }

    next() {
        const token = this.peek();
        this.currentToken = null;
        return token;
    }

    peek() {
        if (this.currentToken === null) {
            this.indexOfLastToken = this.index;
            this.currentToken = this.getNext();
        }

        return this.currentToken;
    }

    getNext() {
        // console.log('skipping (non-newline) whitespace')
        this.skipWhiteSpace();
        let token;

        // console.log('reading comment')
        token = this.readComment();
        if (token !== null) {
            return token;
        }

        // console.log('reading brace')
        token = this.readBrace();
        if (token !== null) {
            return token;
        }

        // console.log('reading paren')
        token = this.readParen();
        if (token !== null) {
            return token;
        }

        token = this.readBracket();
        if (token !== null) {
            return token;
        }

        token = this.readString();
        if (token !== null) {
            return token;
        }

        // console.log('reading prop types keyword')
        token = this.readPropTypesWord();
        if (token !== null) {
            return token;
        }

        token = this.readIsRequiredWord();
        if (token !== null) {
            return token;
        }

        // console.log('reading word')
        token = this.readAlpha();
        if (token !== null) {
            return token;
        }

        // console.log('reading colon')
        token = this.readColon();
        if (token !== null) {
            return token;
        }

        // console.log('reading comma')
        token = this.readComma();
        if (token !== null) {
            return token;
        }

        // console.log('reading unknown')
        token = this.readWhileRegExp(/\S/);
        return {
            type: 'unknown',
            symbol: token
        }
    }

    skipWhiteSpace() {
        this.readWhileRegExp(/\s/);
    }

    readComment() {
        let maybeStartOfComment = this.input.slice(this.index, this.index+2);
        if (maybeStartOfComment === "//") {
            this.index += 2;
            const comment = this.readUntilRegExp(/\n/);
            return {
                type: 'comment',
                symbol: comment.slice(1)
            }
        }

        maybeStartOfComment = this.input.slice(this.index, this.index+2);
        if (maybeStartOfComment === "/*") {
            this.index += 2;

            const comment = this.readMultiLineComment();
            return {
                type: 'comment',
                symbol: comment
            }
        }

        return null
    }

    readMultiLineComment() {
        const comment = this.readWhilePredicate(x => !(/\*/.test(x) && /\//.test(this.input.slice(this.index+1))))
        this.index += 2;
        const lines = comment.split('\n').filter(l => l !== "" && !/^\s+$/.test(l));
        let minIndent = 100;
        let indent = 0;
        for (let i = 0; i<lines.length; i++) {
            indent = 0;
            // Assumes all lines within a comment
            // agree on tabs vs spaces
            // (pretty safe assumption)
            for (let j = 0; j < lines[i].length; j++) {
                if (!/[\t ]/.test(lines[i].charAt(j))) {
                    break;
                }
                indent++;
            }

            if (indent < minIndent) {
                minIndent = indent;
            }
        }
        return lines.map(l => l.slice(minIndent)).filter(l => !!l);
    }

    readBrace() {
        const left = this.readOneCharRegExp(/{/);
        if (left) {
            return {
                type: 'left-brace',
                symbol: left,
            }
        }

        const right = this.readOneCharRegExp(/}/);
        if (right) {
            return {
                type: 'right-brace',
                symbol: right,
            }
        }

        return null;
    }

    readParen() {
        const left = this.readOneCharRegExp(/\(/);
        if (left) {
            return {
                type: 'left-paren',
                symbol: left,
            }
        }

        const right = this.readOneCharRegExp(/\)/);
        if (right) {
            return {
                type: 'right-paren',
                symbol: right,
            }
        }

        return null;
    }

    readBracket() {
        const left = this.readOneCharRegExp(/\[/);
        if (left) {
            return {
                type: 'left-bracket',
                symbol: left,
            }
        }

        const right = this.readOneCharRegExp(/\]/);
        if (right) {
            return {
                type: 'right-bracket',
                symbol: right,
            }
        }

        return null;
    }

    readString() {
        const startDoubleQuote = this.readOneCharRegExp(/"/);
        if (startDoubleQuote !== "") {
            const stringValue = this.readUntilRegExp(/"/);
            if (stringValue !== "") {
                this.readOneCharRegExp(/"/);
                return {
                    type: 'string-literal',
                    symbol: stringValue
                }
            }
        }

        const startSingleQuote = this.readOneCharRegExp(/'/);
        if (startSingleQuote !== "") {
            const stringValue = this.readUntilRegExp(/'/);
            if (stringValue !== "") {
                this.readOneCharRegExp(/'/);
                return {
                    type: 'string-literal',
                    symbol: stringValue
                }
            }
        }


        return null;
    }

    readPropTypesWord() {
        const maybePropTypesWord = this.input.slice(this.index, this.index + 10);
        if (/^PropTypes\.$/.test(maybePropTypesWord)) {
            this.index += 10;
            return {
                type: 'prop-types-keyword',
                symbol: maybePropTypesWord,
            }
        }

        return null;
    }

    readIsRequiredWord() {
        const maybeIsRequiredWord = this.input.slice(this.index, this.index + 11);
        if (/^\.isRequired$/.test(maybeIsRequiredWord)) {
            this.index += 11;
            return {
                type: 'is-required-keyword',
                symbol: maybeIsRequiredWord,
            }
        }

        return null;
    }

    readAlpha() {
        const word = this.readWhileRegExp(/\w/);
        if (word) {
            return {
                type: 'alpha-numeric',
                symbol: word,
            }
        }

        return null;
    }

    readColon() {
        const colon = this.readOneCharRegExp(/:/);
        if (colon) {
            return {
                type: 'colon',
                symbol: colon,
            }
        }

        return null;
    }

    readComma() {
        const comma = this.readOneCharRegExp(/,/);

        if (comma) {
            return {
                type: 'comma',
                symbol: comma,
            }
        }

        return null;
    }

    readWhileRegExp(re) {
        const output = [];
        while (!this.eof() && re.test(this.peekChar())) {
            output.push(this.nextChar());
        }

        return output.join('');
    }

    readUntilRegExp(re) {
        const output = [];
        while (!this.eof() && !re.test(this.peekChar())) {
            output.push(this.nextChar());
        }

        return output.join('');
    }

    readWhilePredicate(predicate) {
        const output = [];
        while (!this.eof() && predicate(this.peekChar())) {
            output.push(this.nextChar());
        }

        return output.join('');
    }

    readOneCharRegExp(re) {
        if (!this.eof() && re.test(this.peekChar())) {
            return this.nextChar();
        }

        return "";
    }

    eof() {
        return this.input.charAt(this.index) === "";
    }

    nextChar() {
        const char = this.peekChar();
        this.index++;
        if (char === "\n") {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    peekChar() {
        return this.input.charAt(this.index);
    }

    croak(msg) {
        let index = this.indexOfLastToken;

        let lastLineBreakIndex = this.input.slice(0, index).lastIndexOf('\n');
        let lastLastLineBreakIndex = -1;
        if (lastLineBreakIndex < 0) {
            lastLineBreakIndex = 0;
        } else {
            lastLastLineBreakIndex = this.input.slice(0, lastLineBreakIndex).lastIndexOf('\n');
        }

        const startIndex = lastLastLineBreakIndex < 0? lastLineBreakIndex : lastLastLineBreakIndex;

        const fullMessage = `\n${
            msg
        }\t(${this.line}, ${this.column})\n${
            this.input.slice(startIndex, index)
        }\n${[...Array(index - lastLineBreakIndex > 0? index - lastLineBreakIndex-1 : 0)]
            .map(() => '-').join('')
        }^`

        console.error(fullMessage);
    }
}

function isLeftBraceToken(token) {
    return token.type === "left-brace";
}

function isRightBraceToken(token) {
    return token.type === "right-brace";
}

function isLeftParenToken(token) {
    return token.type === "left-paren";
}

function isRightParenToken(token) {
    return token.type === "right-paren";
}

function isLeftBracketToken(token) {
    return token.type === "left-bracket";
}

function isRightBracketToken(token) {
    return token.type === "right-bracket";
}

function isAlphaNumericToken(token) {
    return token.type === "alpha-numeric";
}

function isColonToken(token) {
    return token.type === "colon";
}

function isPropTypesKeywordToken(token) {
    return token.type === "prop-types-keyword";
}

function isIsRequiredKeywordToken(token) {
    return token.type === "is-required-keyword";
}

function isCommaToken(token) {
    return token.type === "comma";
}

function isCommentToken(token) {
    return token.type === "comment";
}

function isStringToken(token) {
    return token.type === "string-literal";
}

module.exports = {
    isLeftBraceToken,
    isRightBraceToken,
    isLeftParenToken,
    isRightParenToken,
    isLeftBracketToken,
    isRightBracketToken,
    isAlphaNumericToken,
    isColonToken,
    isPropTypesKeywordToken,
    isIsRequiredKeywordToken,
    isCommaToken,
    isCommentToken,
    isStringToken,

    PropTypesTokenizer,
}