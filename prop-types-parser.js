const {
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
} = require('./prop-types-tokenizer');

class PropTypesParser {
    constructor({ fileName="", showWarnings=true } = {}) {
        this.fileName = fileName;
        this.currentComponentName = "";
        this.currentComponentDescription = [];
        this.showWarnings = showWarnings;
        this.isFirstWarningOrError = true;
        this.tokenizer = new PropTypesTokenizer();
    }

    parse(input) {
        const propTypesDefinitionRe = /(([A-Z]\w+)\.|(static)\s+)propTypes\s*=/g;
        let propTypesDefinitionMatch;
        let startIndex;
        const outputs = [];
        for (let i = 0; i < 100 && (propTypesDefinitionMatch = propTypesDefinitionRe.exec(input)) !== null; i++) {
            startIndex = propTypesDefinitionMatch.index + propTypesDefinitionMatch[0].length;
            this.tokenizer.setInput(input.slice(startIndex));
            this.isFirstWarningOrError = true;
            this.currentComponentName = propTypesDefinitionMatch[2] || propTypesDefinitionMatch[1];
            this.currentComponentDescription = [];
            
            try {
                const parsedProps = this.propTypesObject();
                outputs.push({
                    componentName: this.currentComponentName,
                    componentDescription: this.currentComponentDescription,
                    props: parsedProps,
                });
            } catch (err) {
                console.log(err)
                console.error(`Failed to parse ${this.currentComponentName}`)
            }
        }

        return outputs;
    }

    /*
        propTypesObject := "{" [comment]? [typeDeclerations]* "}"
     */
    propTypesObject(isInitial=true) {
        const arrayOfPropData = [];
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftBraceToken(brace), "Could not parse prop types, expected left brace");

        let initialDescription = [];
        let comment = this.tokenizer.peek();
        for (let i = 0; i < 100 && this.match(isCommentToken(comment)); i++) {
            if (isInitial) {
                if (Array.isArray(comment.symbol)) {
                    initialDescription = initialDescription.concat(comment.symbol);
                } else {
                    initialDescription.push(comment.symbol);
                }
            } else {
                this.warn(false, "Unexpected comment, ignored");
            }
            comment = this.tokenizer.peek();
        }

        if (isInitial) {
            this.currentComponentDescription = initialDescription;
        }

        const MAX_PROPS = 100;

        brace = this.tokenizer.peek();
        for (let i = 0; i < MAX_PROPS && !this.match(isRightBraceToken(brace)); i++) {
            arrayOfPropData.push(this.typeDeclarations());
            brace = this.tokenizer.peek();
        }

        return arrayOfPropData;
    }

    /*
        typeDeclarations := [alphaNumeric]":" "PropTypes." [typeValueAndDescription]
     */
    typeDeclarations() {
        let name = this.tokenizer.peek();
        this.expectMatch(isAlphaNumericToken(name), "Expected the name of a prop (no strange symbols)");

        let colon = this.tokenizer.peek();
        this.expectMatch(isColonToken(colon), "Expected a colon after a prop name / obj key");

        const propTypesKwrd = this.tokenizer.peek();
        this.expectMatch(isPropTypesKeywordToken(propTypesKwrd), "Expected 'PropTypes' declaration");

        const type = this.typeValueAndDescription();

        return {
            name: name.symbol,
            ...type,
        }
    }

    /*
        typeValueAndDescription := [typeValue]"," [description]
        description := [comment]*
     */
    typeValueAndDescription() {
        const { type, children } = this.typeValue();

        let required = false;
        const isRequired = this.tokenizer.peek();
        if (this.match(isIsRequiredKeywordToken(isRequired))) {
            required = true;
        }

        const comma = this.tokenizer.peek();
        this.warnMatch(isCommaToken(comma), "No trailing comma found in object");

        let descriptionLines = [];
        let description = this.tokenizer.peek();
        for (let i = 0; i < 100 && this.match(isCommentToken(description)); i++) {
            if (Array.isArray(description.symbol)) {
                descriptionLines = descriptionLines.concat(description.symbol);
            } else {
                descriptionLines.push(description.symbol);
            }
            description = this.tokenizer.peek();
        }

        this.warn(descriptionLines.length > 0, "No description for prop");

        return {
            type,
            required,
            children,
            description: descriptionLines,
        }
    }

    /*
        typeValue := [type]
        type := [arrayOrObjectOf]
              | [shapeOrExact]
              | [oneOfLiteral]
              | [oneOfType]
              | [instanceOf]
              | .*
     */
    typeValue() {
        let type = this.tokenizer.peek();
        let children = [];

        let brace;
        if (this.match(type.symbol === "arrayOf" || type.symbol === "objectOf")) {
            children = this.arrayOrObjectOf();
        } else if (this.match(type.symbol === "shape" || type.symbol === "exact")) {
            children = this.shapeOrExact();
        } else if (this.match(type.symbol === "oneOf")) {
            children = this.oneOfLiteral();
        } else if (this.match(type.symbol === "oneOfType")) {
            children = this.oneOfType();
        } else if (this.match(type.symbol === "instanceOf")) {
            children = this.instanceOfClass();
        } else {
            this.consume();
        }

        type = type.symbol;
        return {
            type,
            children,
        }
    }

    /*
        arrayOrObjectOf := ("arrayOf" | "objectOf") "(" "PropTypes." [typeValue] ")"
     */
    arrayOrObjectOf() {
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftParenToken(brace), "Could not parse prop types, expected left parenthesis");

        const propTypesKwrd = this.tokenizer.peek();
        this.expectMatch(isPropTypesKeywordToken(propTypesKwrd), "Expected 'PropTypes' declaration");

        const children = [this.typeValue()];
        
        brace = this.tokenizer.peek();
        this.expectMatch(isRightParenToken(brace), "Could not parse prop types, expected right parenthesis");

        return children;
    }

    /*
        shapeOfExact := ("shape" | "exact") "(" [propTypesObject] ")"
     */
    shapeOrExact() {
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftParenToken(brace), "Could not parse prop types, expected left parenthesis");


        const children = this.propTypesObject(false);

        brace = this.tokenizer.peek();
        this.expectMatch(isRightParenToken(brace), "Could not parse prop types, expected right parenthesis");

        return children;
    }

    /*
        oneOfLiteral := 
     */
    oneOfLiteral() {
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftParenToken(brace), "Could not parse prop types, expected left parenthesis");

        brace = this.tokenizer.peek();
        this.expectMatch(isLeftBracketToken(brace), "Could not parse prop types, expected left bracket");

        const children = [];
        let maybeLiteral = this.tokenizer.peek();
        let comma;
        for (let i = 0; i < 100 && !this.match(isRightBracketToken(maybeLiteral)); i++) {
            children.push(maybeLiteral);
            this.consume();

            comma = this.tokenizer.peek();
            this.warnMatch(isCommaToken(comma), "No trailing comma found in array");
            maybeLiteral = this.tokenizer.peek();
        }


        brace = this.tokenizer.peek();
        this.expectMatch(isRightParenToken(brace), "Could not parse prop types, expected right parenthesis");

        return children;
    }

    oneOfType() {
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftParenToken(brace), "Could not parse prop types, expected left parenthesis");

        brace = this.tokenizer.peek();
        this.expectMatch(isLeftBracketToken(brace), "Could not parse prop types, expected left bracket");

        const children = [];
        let lookahead = this.tokenizer.peek();
        let comma;
        for (let i = 0; i < 100 && !this.match(isRightBracketToken(lookahead)); i++) {
            this.expectMatch(isPropTypesKeywordToken(lookahead), "Expected 'PropTypes' declaration");

            const child = this.typeValue();
            children.push(child);

            comma = this.tokenizer.peek();
            this.warnMatch(isCommaToken(comma), "No trailing comma found in array");

            lookahead = this.tokenizer.peek();
        }


        brace = this.tokenizer.peek();
        this.expectMatch(isRightParenToken(brace), "Could not parse prop types, expected right parenthesis");

        return children;
    }

    instanceOfClass() {
        let brace = this.tokenizer.peek();
        this.expectMatch(isLeftParenToken(brace), "Could not parse prop types, expected left parenthesis");

        const children = [this.typeValue()];

        brace = this.tokenizer.peek();
        this.expectMatch(isRightParenToken(brace), "Could not parse prop types, expected right parenthesis");

        return children;
    }

    warn(bool, msg) {
        if (!bool && this.showWarnings) {
            this.croakWithPrefix(`\x1b[33mWarning:\x1b[0m ${msg}`);
        }
    }

    warnMatch(bool, msg) {
        if (bool) {
            this.consume();
        } else if (this.showWarnings) {
            this.croakWithPrefix(`\x1b[33mWarning:\x1b[0m ${msg}`);
        }
    }

    expectMatch(bool, msg) {
        if (bool) {
            this.consume();
            return;
        }

        this.croakWithPrefix(`\x1b[1m\x1b[41m\x1b[33m Error: \x1b[0m ${msg}`);
    }

    croakWithPrefix(msg) {
        let prefix = "";
        if (this.isFirstWarningOrError) {
            prefix = `\n${this.fileName}\n${this.currentComponentName}\n`;
            this.isFirstWarningOrError = false;
        }
        this.croak(`${prefix}${msg}`);
    }

    croak(msg) {
        this.tokenizer.croak(msg);
    }

    match(bool) {
        if (bool === true) {
            this.consume();
        }

        return bool;
    }

    consume() {
        if (this.tokenizer !== null) {
            this.tokenizer.next();
        }
    }
}

module.exports = {
    PropTypesParser
}